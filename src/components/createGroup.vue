<!--创建群主表单组件-->
<template>
  <a-modal
      width="660px"
      title="创建群组"
      :visible="visible"
      :confirm-loading="loading"
      :closable="true"
      @ok="submit"
      @cancel="hide">
    <template slot="footer">
      <a-button key="cancel" @click="hide">取消</a-button>
      <a-button key="submit" :max="10" @click="submit" :loading="loading" type="primary" :disabled="btnDisabled">
        保存
      </a-button>
    </template>
    <a-form-item label="群组名称">
      <a-input placeholder="请输入群组名称" v-model="name"></a-input>
    </a-form-item>
    <a-transfer
        :titles="['所有用户','群组成员']"
        :data-source="dataSource"
        :render="item => item.title"
        @change="handleChange"
        show-search
        :list-style="{
      width: '250px',
      height: '300px',
    }"
        :operations="['添加成员', '删除成员']"
        :target-keys="targetKeys"
    >
    </a-transfer>
  </a-modal>
</template>

<script>
export default {
  name: "createGroup",
  data: function () {
    return {
      visible: false,
      loading: false,
      name: "",
      targetKeys: [],
      dataSource: [],
      users: [],
    }
  },
  methods: {
    show: function () {
      this.name = ""
      this.targetKeys = []
      this.visible = true
    },
    hide: function () {
      this.loading = false
      this.visible = false
    },
    handleChange(nextTargetKeys, direction, moveKeys) {
      this.targetKeys = nextTargetKeys;

      console.log('targetKeys: ', nextTargetKeys);
      console.log('direction: ', direction);
      console.log('moveKeys: ', moveKeys);
    },
    renderItem: function (item){
      return {
        label: item.name,
        value: item.name,
        rowKey: item.ID
      }
    },
    userList: function (userList){
      let u = []
      for (const k in userList){
        u.push({
          key: userList[k].ID,
          title: userList[k].name,
          description: userList[k].name,
          disabled: false,
        })
      }
      this.dataSource = u
      this.users = userList
    },
    submit() {
      if (this.name.length > 20) {
        return this.$notification.info({
          message: '群组名称过长',
          description: '群组名称的长度最多不超过20个字',
          duration: 1.5
        });
      }
      if (this.targetKeys.length < 3) {
        return this.$notification.info({
          message: '请选择2位及以上的成员',
          description: '与1位成员对话，可点击成员进行私聊',
          duration: 1.5
        });
      }
      let userList = [];
      for (const k in this.targetKeys){
        userList.push(this.users[k])
      }
      this.$emit("submit", {
        name: this.name,
        member_list: userList
      })
    }
  },
  computed: {
    btnDisabled: function () {
      return this.targetKeys.length < 3;
    }
  }
}
</script>

<style scoped>

</style>