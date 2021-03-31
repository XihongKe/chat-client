<!--创建用户表单组件-->
<template>
  <a-modal
      title="创建用户"
      :visible="visible"
      :confirm-loading="loading"
      :closable="false"
      @ok="userSubmit">
    <template slot="footer">
      <a-button key="submit" :max="10" @click="userSubmit" :loading="loading" type="primary" :disabled="btnDisabled">
        保存
      </a-button>
    </template>
    <a-form-item label="昵称">
      <a-input placeholder="请输入你的昵称" v-model="name"></a-input>
    </a-form-item>
    <a-form-item label="头像">

      <a-row>
        <a-space class="img-space" :size="'large'" :align="'center'">
          <a-col :span="2" v-for="(item,key) in img_list" v-bind:key="'img-k'+key" @click="imgChoose(key)">
            <span :class="cur_img_key === key ? 'ant-avatar-very-lg-active' : ''"
                  class="ant-avatar ant-avatar-very-lg ant-avatar-circle ant-avatar-image"><img :alt="key"
                                                                                                draggable="false"
                                                                                                :src="item"></span>
          </a-col>
        </a-space>
      </a-row>
    </a-form-item>
  </a-modal>
</template>

<script>
export default {
  name: "createUser",
  data: function () {
    return {
      visible: false,
      loading: false,
      name: "",
      cur_img_key: -1,
      head_img_url: "",
      img_list: []
    }
  },
  mounted() {
    for (let i = 0; i < 10; i++) {
      this.img_list.push("/img/" + i + ".png")
    }
  },
  methods: {
    show: function () {
      this.visible = true
    },
    hide: function () {
      this.loading = false
      this.visible = false
    },
    imgChoose: function (i) {
      this.head_img_url = "/img/" + i + ".png";
      this.cur_img_key = i;
    },
    userSubmit: function () {
      if (this.name.length > 20) {
        return this.$notification.info({
          message: '昵称过长',
          description: '昵称的长度最多不超过20个字',
          duration: 1.5
        });
      }
      if (this.head_img_url === "") {
        return this.$notification.info({
          message: '未选择头像',
          description: '请点击一个图片，作为你的头像',
          duration: 1.5
        });
      }
      this.$emit('submit', {
        name: this.name,
        head_img_url: this.head_img_url
      });
    }
  },
  computed: {
    btnDisabled: function () {
      return this.name.length < 0;
    }
  }
}
</script>

<style scoped>
.img-space {
  display: flex;
  flex-wrap: wrap;
}

.img-space .ant-space-item {
  display: flex;
  margin-bottom: 20px;
}

.ant-avatar-very-lg {
  width: 70px;
  height: 70px;
  line-height: 70px;
  border-radius: 50%;
  border: 5px solid transparent;
  cursor: pointer;
}

.ant-avatar-very-lg:hover {
  border: 5px solid #dadada;
}
.ant-avatar-very-lg-active {
  border: 5px solid #dadada;
}
</style>