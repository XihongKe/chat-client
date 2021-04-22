<template>
  <a-row type="flex" id="app">
    <!--服务器选择对话框-->
    <a-modal
        title="连接服务器"
        :visible="hostModalVisible"
        :closable="false"
        @ok="wsInit">
      <template slot="footer">
        <a-button key="submit" :max="10" @click="wsInit" type="primary"
                  :disabled="host === ''">
          保存
        </a-button>
      </template>
      <a-form-item label="服务器ip地址">
        <a-input placeholder="请输入服务器ip地址" v-model="host"></a-input>
      </a-form-item>
    </a-modal>
    <!--创建用户对话框-->
    <create-user ref="createUser" @submit="userSubmit"></create-user>
    <!--创建群组对话框-->
    <create-group ref="createGroup" @submit="groupSubmit"></create-group>
    <!--好友列表-->
    <a-col flex="250px" id="chat-list">
      <a-row style="margin-bottom: 15px">
        <a-col style="padding-left: 15px" :span="20">
          <a-input id="search-chat-input" placeholder="搜索" v-model="keyword"/>
        </a-col>
        <a-col style="text-align: center" :span="4">
          <!--添加群组-->
          <a-button shape="circle" icon="usergroup-add" @click="$refs.createGroup.show()"></a-button>
        </a-col>
      </a-row>
      <div v-for="(item, key) in chatList" v-bind:key="key">
        <a-list-item :class="item.ID === receiver ? 'chat-list-active' : ''" v-show="isChatItemShow(item.name)">
          <a-list-item-meta
              :description=lastMsg(item.chatLog)
          >
            <a slot="title" @click="toggleChat(key)">{{ item.name + (item.ID === userInfo.ID ? "（我）" : "") }}</a>
            <a-badge slot="avatar" :count=item.newMsgCount>
              <!--用户头像-->
              <a-avatar v-if="item.type === 'user'" class="chat-list-avatar" :src="item.head_img_url"
                        :style="{filter: item.online === false ? 'gray': 'none'}"/>
              <!--群组头像-->
              <a-avatar v-else class="chat-list-avatar" style="background-color:#1890ff" icon="team"/>
            </a-badge>
          </a-list-item-meta>
        </a-list-item>
      </div>
    </a-col>
    <!--聊天窗口-->
    <a-col flex="auto">
      <a-row id="log">
        <a-row v-for="(item, key) in curWindow" v-bind:key="key">
          <!--自己发出的消息-->
          <template v-if="item.ID === userInfo.ID">
            <a-avatar class="avatar-right" v-bind:src="item.head_img_url"/>
            <div class="ant-list-item-meta-content ant-list-item-meta-content-right">
              <h4 class="ant-list-item-meta-title">
                <a href="javascript:void(0)">{{ item.name }}</a>
              </h4>
              <div class="ant-list-item-meta-description">{{ item.content }}</div>
            </div>
          </template>
          <!--好友的消息-->
          <template v-else>
            <a-avatar class="avatar-left" v-bind:src="item.head_img_url"/>
            <div class="ant-list-item-meta-content ant-list-item-meta-content-left">
              <h4 class="ant-list-item-meta-title">
                <a href="javascript:void(0)">{{ item.name }}</a>
              </h4>
              <div class="ant-list-item-meta-description">{{ item.content }}</div>
            </div>
          </template>
        </a-row>
      </a-row>
      <!--输入框-->
      <a-row id="form">
        <a-textarea class="msg-area" :rows="4" v-model="msg" @pressEnter.prevent="onSend($event)"
                    placeholder="输入消息，按下Enter发送"/>
      </a-row>
    </a-col>
  </a-row>
</template>

<script>
import _ from "lodash";
import createUser from "./components/createUser";
import createGroup from "./components/createGroup";

const MSG_TYPE_USER = 1;
const MSG_TYPE_GROUP = 2;
const MSG_TYPE_GET_USER = 3;
const MSG_TYPE_USER_INFO = 4;
const MSG_TYPE_SUBMIT_USER_INFO = 5;
const MSG_TYPE_GROUP_CREATE = 6;
const MSG_TYPE_USER_LEAVE = 7;
export default {
  data: function () {
    return {
      host: "127.0.0.1:8282",
      userInfo: {}, // 用户自身的数据
      receiver: null, // 当前聊天对象ID
      conn: null, // websocket连接
      chatList: [], // 用户&群组列表
      curWindow: [], // 当前窗口展示的消息列表
      msg: "", // 当前编辑的消息
      hostModalVisible: false,
      hostModalLoading: false,
      keyword: "",
    };
  },
  mounted: function () {
    if (!window["WebSocket"]) {
      return this.$notification.info({
        message: 'SYSTEM',
        description: '浏览器不支持WebSocket',
        duration: 1.5
      });
    }
    this.hostModalVisible = true;
  },
  methods: {
    // 连接服务器
    wsInit: function () {
      this.hostModalVisible = false;
      this.conn = new WebSocket("ws://" + this.host + "/ws");
      this.conn.onopen = () => {
        this.$refs.createUser.show() // 打开用户信息选择弹窗
      }
      this.conn.onclose = () => {
        this.$confirm({
          title: '无法与服务器建立连接',
          content: "提供了错误的服务器地址或服务器故障？请联系管理员.",
          onOk() {
            window.close()
          },
          onCancel() {
          },
        });
      }
      this.conn.onmessage = (evt) => {
        let data = JSON.parse(evt.data);
        console.log("收到消息包：", data)
        switch (data.type) {
          case MSG_TYPE_USER:  // 处理用户消息
            this.userMsgHandler(data)
            break;
          case MSG_TYPE_GROUP:  // 处理群组消息
            this.groupMsgHandler(data)
            break;
          case MSG_TYPE_GET_USER:  // 获取好友列表
            this.getUserHandler(data)
            break;
          case MSG_TYPE_USER_INFO: // 获取服务器下发的自身用户信息
            this.userInfoHandler(data)
            break;
          case MSG_TYPE_GROUP_CREATE: // 新群组
            this.getGroupHandler(data)
            break;
          case MSG_TYPE_USER_LEAVE: // 用户离开
            this.userLeaveHandler(data)
            break;
          default:
            console.log("未定义的消息类型：", data.type)
        }
      }
    },
    // 提交用户信息
    userSubmit: function (info) {
      this.conn.send(JSON.stringify({
        type: MSG_TYPE_SUBMIT_USER_INFO,
        content: JSON.stringify({
          name: info.name,
          head_img_url: info.head_img_url,
        })
      }))
    },
    // 创建群组
    groupSubmit: function (info) {
      console.log("创建群组提交参数", info)
      this.conn.send(JSON.stringify({
        type: MSG_TYPE_GROUP_CREATE,
        content: JSON.stringify(info)
      }))
    },
    // 消息发送
    onSend: function () {
      if (this.msg.length === 0) { // 未输入消息
        return;
      }
      if (this.receiver === null) {
        return this.$notification.info({
          message: '未选择发送对象',
          description: '请点击列表中的好友进行聊天',
          duration: 1.5
        });
      }
      let message = {
        receiver: this.receiver,
        type: MSG_TYPE_USER,
        sender: this.userInfo.ID,
        content: this.msg
      }
      if (_.find(this.chatList, ['ID', this.receiver]).type === "group"){
        message.type = MSG_TYPE_GROUP
      }
      this.conn.send(JSON.stringify(message))
      // 推入当前聊天窗口
      this.curWindow.push({
        ID: this.userInfo.ID,
        name: this.userInfo.name,
        head_img_url: this.userInfo.head_img_url,
        content: this.msg
      })
      // 清空消息
      this.msg = ""
    },
    // 点击好友，切换聊天
    toggleChat: function (key) {
      this.receiver = this.chatList[key].ID        // 切换消息接收者
      this.curWindow = this.chatList[key].chatLog  // 切换当前聊天窗口
      this.chatList[key].newMsgCount = 0           // 清零未读消息数
    },
    // 好友列表消息概要
    lastMsg: function (chatLog) {
      let s = "";
      if (chatLog.length > 0) {
        s = _.truncate(chatLog[chatLog.length - 1].content, {
          length: 10
        })
      }
      return s;
    },
    // 处理群组消息
    groupMsgHandler: function (data) {
      if (data.sender === this.userInfo.ID) {
        return; // 发送者是自己 不需要处理
      }
      let groupKey = _.findKey(this.chatList, ['ID', data.from_group])
      if (groupKey !== undefined){
        let sender = _.find(this.chatList[groupKey].member, ['ID', data.sender])
        this.chatList[groupKey].chatLog.push({ // 推入消息记录
          ID: sender.ID,
          name: sender.name,
          head_img_url: sender.head_img_url,
          content: data.content
        });
        if (sender.ID !== this.receiver) {
          this.chatList[groupKey].newMsgCount++;
        }
      }
    },
    // 处理用户消息
    userMsgHandler: function (data) {
      if (data.sender === this.userInfo.ID) {
        return; // 发送者是自己 不需要处理
      }
      let senderKey = _.findKey(this.chatList, ['ID', data.sender])
      if (senderKey !== undefined){
        let sender = this.chatList[senderKey]
        this.chatList[senderKey].chatLog.push({ // 推入消息记录
          ID: sender.ID,
          name: sender.name,
          head_img_url: sender.head_img_url,
          content: data.content
        });
        if (sender.ID !== this.receiver) {
          this.chatList[senderKey].newMsgCount++;
        }
      } else{
        // TODO 获取不到对应用户信息的情况 可加入重试
        console.log("获取不到对应用户");
      }
    },
    // 用户列表
    getUserHandler: function (data) {
      let users = JSON.parse(data.content)

      for (const k in users) {
        // 列表中不存在才加入列表
        if (_.findKey(this.chatList, ['ID', users[k].ID]) === undefined) {
          users[k].type = "user"
          users[k].online = true
          this.chatList.push(users[k])
        }
      }
      this.initChatLog()
      this.$refs.createGroup.userList(users)
      console.log("好友列表:", this.chatList);
    },
    // 处理用户个人信息接收
    userInfoHandler: function (data) {
      this.userInfo = JSON.parse(data.content)
      this.$refs.createUser.hide();
      console.log("用户信息:", this.userInfo)
    },
    // 群组列表
    getGroupHandler: function (data) {
      this.$refs.createGroup.hide();
      let groups = JSON.parse(data.content)

      for (const k in groups) {
        // 列表中不存在才加入列表
        if (_.findKey(this.chatList, ['ID', groups[k].ID]) === undefined) {
          groups[k].type = "group"
          this.chatList.push(groups[k])
        }
      }

      this.initChatLog()
    },
    userLeaveHandler: function (data) {
      let k = _.findKey(this.chatList, ['ID', data.content])
      if (k !== undefined) {
        this.chatList[k].online = false;
      }
    },
    initChatLog: function () { // 初始化消息记录、未读消息数
      for (const i in this.chatList) {
        if (!this.chatList[i].chatLog) this.chatList[i].chatLog = [];
        if (!this.chatList[i].newMsgCount) this.chatList[i].newMsgCount = 0;
      }
    },
  }, computed: {
    // 搜索用户
    isChatItemShow() {
      return function (name) {
        return this.keyword === "" || (name.search(this.keyword) >= 0)
      }
    }
  },
  components: {
    createUser, createGroup
  }
}

</script>

<style>

#app {
  height: 100%;
  /*设置页面可拖动*/
  -webkit-app-region: drag;
}

#log {
  position: absolute;
  top: 0;
  display: block;
  background: white;
  margin: 0;
  height: 80%;
  width: 100%;
  padding-top: 16px;
  overflow: auto;
}

#form {
  position: absolute;
  bottom: 0;
  display: block;
  margin: 0;
  height: 20%;
  width: 100%;
  overflow: hidden;
  border-top: 1px solid #90d4b5;
}

#chat-list {
  padding-top: 35px;
  background: #ececec;
  margin: 0;
  height: 100%;
  overflow: auto;
}

#search-chat-input {
  border: none;
  border-radius: unset;
}

.chat-list-active {
  background: #c8c8c8;
}

.chat-list-avatar {
  margin-left: 16px;
}

.msg-area {
  resize: none;
  height: 100% !important;
  border: none;
  border-radius: 0;
}

.avatar-right {
  float: right;
  margin-right: 16px !important;
  margin-left: 16px;
}

.avatar-left {
  float: left;
  margin-right: 16px;
  margin-left: 16px;
}

.ant-list-item-meta-content-right {
  float: right;
  text-align: right;
}

.ant-list-item-meta-content-left {
  float: left;
  text-align: left;
}
</style>
