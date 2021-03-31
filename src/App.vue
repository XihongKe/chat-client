<template>
  <a-row type="flex" id="app">
    <!--创建用户对话框-->
    <create-user ref="createUser" @submit="userSubmit"></create-user>
    <!--好友列表-->
    <a-col flex="250px" id="chat-list">
      <div v-for="(item, key) in chatList" v-bind:key="key">
        <a-list-item :class="item.ID === receiver ? 'chat-list-active' : ''">
          <a-list-item-meta
              :description=lastMsg(item.chatLog)
          >
            <a slot="title" @click="toggleChat(key)">{{ item.name + (item.ID === userInfo.ID ? "（我）" : "") }}</a>
            <a-badge slot="avatar" :count=item.newMsgCount>
              <a-avatar class="chat-list-avatar" :src="item.head_img_url"/>
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

const MSG_TYPE_USER = 1;
const MSG_TYPE_GROUP = 2;
const MSG_TYPE_GET_USER = 3;
const MSG_TYPE_USER_INFO = 4;
const MSG_TYPE_SUBMIT_USER_INFO = 5;
export default {
  data: function () {
    return {
      userInfo: {}, // 用户自身的数据
      receiver: null, // 当前聊天对象ID
      conn: null, // websocket连接
      chatList: [], // 用户&群组列表
      curWindow: [], // 当前窗口展示的消息列表
      msg: "", // 当前编辑的消息
      createUserVisible: false,
      createUserLoading: false,
    };
  },
  mounted: function () {
    this.$refs.createUser.show()
    if (!window["WebSocket"]) {
      this.curWindow.push({
        name: 'SYSTEM',
        head_img_url: "",
        content: "WebSockets Not Support.",
      })
      return;
    }
    this.createUserVisible = true;
    this.conn = new WebSocket("ws://localhost:8282/ws");
    this.conn.onclose = () => {
      this.curWindow.push({
        name: 'SYSTEM',
        head_img_url: "",
        content: "Connection Closed.",
      })
    }
    this.conn.onmessage = (evt) => {
      let data = JSON.parse(evt.data);
      console.log("收到消息包：", data)
      switch (data.type) {
        case MSG_TYPE_USER:  // 处理用户消息
          this.userHandler(data)
          break;
        case MSG_TYPE_GROUP:  // 处理群组消息
          this.groupHandler(data)
          break;
        case MSG_TYPE_GET_USER:  // 获取好友列表
          this.getUserHandler(data)
          break;
        case MSG_TYPE_USER_INFO: // 获取服务器下发的自身用户信息
          this.userInfoHandler(data)
          break;
        default:
          console.log("未定义的消息类型：", data.type)
      }
    }
  },
  methods: {
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
      console.log(s)
      return s;
    },
    // 处理群组消息
    groupHandler: function (data) {
      return data;
    },
    // 处理用户消息
    userHandler: function (data) {
      if (data.sender === this.userInfo.ID) {
        return; // 发送者是自己 不需要处理
      }
      let sender = null
      for (let k in this.chatList) {
        if (this.chatList[k].ID === data.sender) {
          sender = this.chatList[k]
          this.chatList[k].chatLog.push({ // 推入消息记录
            ID: sender.ID,
            name: sender.name,
            head_img_url: sender.head_img_url,
            content: data.content
          });
          if (sender.ID !== this.receiver) {
            this.chatList[k].newMsgCount++;
          }
          console.log(sender.ID, this.userInfo.ID, sender.ID === this.userInfo.ID)
          break
        }
      }
      if (sender === null) {
        // TODO 获取不到对应用户信息的情况 可加入重试
        console.log("获取不到对应用户");
      }
    },
    // 用户列表
    getUserHandler: function (data) {
      let users = JSON.parse(data.content)
      if (this.chatList.length === 0) {
        this.chatList = users;
      } else {
        for (const k in users) {
          let exist = false;
          for (const i in this.chatList) {
            if (users[k].ID === this.chatList[i].ID) {
              console.log("跳过", users[k].ID, this.chatList[i].ID)
              exist = true;
              break;
            }
          }
          if (!exist) {
            this.chatList.push(users[k])
          }
        }
      }
      for (const i in this.chatList) { // 初始化消息记录、未读消息数
        if (!this.chatList[i].chatLog) this.chatList[i].chatLog = [];
        if (!this.chatList[i].newMsgCount) this.chatList[i].newMsgCount = 0;
      }
      console.log("好友列表:", this.chatList);
    },
    // 处理用户个人信息接收
    userInfoHandler: function (data) {
      this.userInfo = JSON.parse(data.content)
      this.$refs.createUser.hide();
      console.log("用户信息:", this.userInfo)
    },
  }, computed: {},
  components: {createUser}
}

</script>

<style>

#app {
  height: 100%;
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
  background: #ececec;
  margin: 0;
  height: 100%;
  overflow: auto;
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
