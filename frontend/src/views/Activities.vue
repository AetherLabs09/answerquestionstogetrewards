<template>
  <div class="activities-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span>活动管理</span>
          <el-button type="primary" @click="showDialog()">
            <el-icon><Plus /></el-icon>
            新建活动
          </el-button>
        </div>
      </template>

      <el-table :data="activities" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="活动名称" min-width="150" />
        <el-table-column prop="start_time" label="开始时间" width="180" />
        <el-table-column prop="end_time" label="结束时间" width="180" />
        <el-table-column prop="target_audience" label="参与人群" width="120" />
        <el-table-column prop="question_count" label="题目数量" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '进行中' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteActivity(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑活动' : '新建活动'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="活动名称" required>
          <el-input v-model="form.name" placeholder="请输入活动名称" />
        </el-form-item>
        <el-form-item label="开始时间" required>
          <el-date-picker
            v-model="form.start_time"
            type="datetime"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" required>
          <el-date-picker
            v-model="form.end_time"
            type="datetime"
            placeholder="选择结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="参与人群">
          <el-input v-model="form.target_audience" placeholder="请输入参与人群范围" />
        </el-form-item>
        <el-form-item label="活动规则">
          <el-input
            v-model="form.rules"
            type="textarea"
            :rows="4"
            placeholder="请输入活动规则说明"
          />
        </el-form-item>
        <el-form-item label="活动封面">
          <el-input v-model="form.cover_image" placeholder="请输入活动封面图片URL" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="进行中" value="active" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveActivity">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'

const loading = ref(false)
const activities = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref({
  name: '',
  start_time: '',
  end_time: '',
  target_audience: '',
  rules: '',
  cover_image: '',
  status: 'active'
})

const loadActivities = async () => {
  loading.value = true
  try {
    activities.value = await api.get('/activities')
  } finally {
    loading.value = false
  }
}

const showDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    form.value = { ...row }
  } else {
    form.value = {
      name: '',
      start_time: '',
      end_time: '',
      target_audience: '',
      rules: '',
      cover_image: '',
      status: 'active'
    }
  }
  dialogVisible.value = true
}

const saveActivity = async () => {
  try {
    const data = {
      ...form.value,
      start_time: form.value.start_time ? new Date(form.value.start_time).toISOString() : '',
      end_time: form.value.end_time ? new Date(form.value.end_time).toISOString() : ''
    }
    
    if (isEdit.value) {
      await api.put(`/activities/${form.value.id}`, data)
      ElMessage.success('活动更新成功')
    } else {
      await api.post('/activities', data)
      ElMessage.success('活动创建成功')
    }
    
    dialogVisible.value = false
    loadActivities()
  } catch (error) {
    console.error(error)
  }
}

const deleteActivity = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个活动吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await api.delete(`/activities/${id}`)
    ElMessage.success('活动删除成功')
    loadActivities()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.activities-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 18px;
  font-weight: 600;
}
</style>
