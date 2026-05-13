<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1>答题领奖励活动管理系统</h1>
        <el-menu mode="horizontal" :default-active="activeMenu" router>
          <el-menu-item index="/activities">活动管理</el-menu-item>
          <el-menu-item index="/questions">题库管理</el-menu-item>
          <el-menu-item index="/quiz">在线答题</el-menu-item>
          <el-menu-item index="/rewards">奖励管理</el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content h1 {
  font-size: 20px;
  font-weight: 600;
}

.app-header .el-menu {
  background: transparent;
  border: none;
}

.app-header .el-menu-item {
  color: white;
  border-bottom: none;
}

.app-header .el-menu-item:hover,
.app-header .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.2);
  border-bottom: 2px solid white;
}

.app-main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
