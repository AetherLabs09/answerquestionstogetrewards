<template>
  <div class="rewards-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span>奖励管理</span>
          <div class="header-actions">
            <el-select v-model="selectedActivity" placeholder="选择活动" style="width: 200px; margin-right: 10px">
              <el-option
                v-for="activity in activities"
                :key="activity.id"
                :label="activity.name"
                :value="activity.id"
              />
            </el-select>
            <el-button type="primary" @click="showDialog()" :disabled="!selectedActivity">
              <el-icon><Plus /></el-icon>
              新增奖励规则
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="奖励规则配置" name="rules">
          <el-table :data="rewards" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="奖励名称" min-width="150" />
            <el-table-column prop="reward_type" label="奖励类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getRewardTypeTag(row.reward_type)">
                  {{ getRewardTypeName(row.reward_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="condition_type" label="触发条件" width="120">
              <template #default="{ row }">
                {{ getConditionName(row.condition_type) }}
              </template>
            </el-table-column>
            <el-table-column prop="condition_value" label="条件值" width="100" />
            <el-table-column prop="reward_value" label="奖励内容" min-width="150" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="showDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteReward(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="用户奖励记录" name="records">
          <div style="margin-bottom: 20px">
            <el-input
              v-model="searchUserId"
              placeholder="请输入用户ID"
              style="width: 300px; margin-right: 10px"
            />
            <el-button type="primary" @click="loadUserRewards">查询</el-button>
          </div>
          <el-table :data="userRewards" style="width: 100%" v-loading="userRewardsLoading">
            <el-table-column prop="activity_name" label="活动名称" width="200" />
            <el-table-column prop="name" label="奖励名称" width="150" />
            <el-table-column prop="reward_type" label="奖励类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getRewardTypeTag(row.reward_type)">
                  {{ getRewardTypeName(row.reward_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reward_value" label="奖励内容" min-width="150" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'claimed' ? 'success' : 'warning'">
                  {{ row.status === 'claimed' ? '已领取' : '待领取' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="获得时间" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑奖励规则' : '新增奖励规则'" width="600px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="奖励名称" required>
          <el-input v-model="form.name" placeholder="请输入奖励名称" />
        </el-form-item>
        <el-form-item label="奖励类型" required>
          <el-select v-model="form.reward_type" placeholder="请选择奖励类型">
            <el-option label="积分" value="points" />
            <el-option label="优惠券" value="coupon" />
            <el-option label="红包" value="red_packet" />
            <el-option label="实物礼品" value="gift" />
            <el-option label="代金券" value="voucher" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发条件" required>
          <el-select v-model="form.condition_type" placeholder="请选择触发条件">
            <el-option label="通关" value="pass" />
            <el-option label="满分" value="full_score" />
            <el-option label="达到指定分数" value="score" />
          </el-select>
        </el-form-item>
        <el-form-item label="条件值" v-if="form.condition_type === 'score'">
          <el-input-number v-model="form.condition_value" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="奖励内容" required>
          <el-input v-model="form.reward_value" placeholder="请输入奖励内容" />
        </el-form-item>
        <el-form-item label="奖励说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入奖励说明"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveReward">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'

const activeTab = ref('rules')
const loading = ref(false)
const userRewardsLoading = ref(false)
const activities = ref([])
const rewards = ref([])
const userRewards = ref([])
const selectedActivity = ref(null)
const searchUserId = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)

const form = ref({
  name: '',
  reward_type: 'points',
  condition_type: 'pass',
  condition_value: 60,
  reward_value: '',
  description: '',
  status: 'active'
})

const getRewardTypeName = (type) => {
  const types = {
    points: '积分',
    coupon: '优惠券',
    red_packet: '红包',
    gift: '实物礼品',
    voucher: '代金券'
  }
  return types[type] || type
}

const getRewardTypeTag = (type) => {
  const tags = {
    points: 'primary',
    coupon: 'success',
    red_packet: 'danger',
    gift: 'warning',
    voucher: 'info'
  }
  return tags[type] || 'info'
}

const getConditionName = (type) => {
  const conditions = {
    pass: '通关',
    full_score: '满分',
    score: '达到分数'
  }
  return conditions[type] || type
}

const loadActivities = async () => {
  try {
    activities.value = await api.get('/activities')
  } catch (error) {
    console.error(error)
  }
}

const loadRewards = async () => {
  if (!selectedActivity.value) return
  loading.value = true
  try {
    rewards.value = await api.get(`/rewards/activity/${selectedActivity.value}`)
  } finally {
    loading.value = false
  }
}

const loadUserRewards = async () => {
  if (!searchUserId.value) {
    ElMessage.warning('请输入用户ID')
    return
  }
  userRewardsLoading.value = true
  try {
    userRewards.value = await api.get(`/rewards/user/${searchUserId.value}`)
  } finally {
    userRewardsLoading.value = false
  }
}

const showDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    form.value = { ...row }
  } else {
    form.value = {
      name: '',
      reward_type: 'points',
      condition_type: 'pass',
      condition_value: 60,
      reward_value: '',
      description: '',
      status: 'active'
    }
  }
  dialogVisible.value = true
}

const saveReward = async () => {
  try {
    const data = {
      ...form.value,
      activity_id: selectedActivity.value
    }
    
    if (isEdit.value) {
      await api.put(`/rewards/${form.value.id}`, data)
      ElMessage.success('奖励规则更新成功')
    } else {
      await api.post('/rewards', data)
      ElMessage.success('奖励规则创建成功')
    }
    
    dialogVisible.value = false
    loadRewards()
  } catch (error) {
    console.error(error)
  }
}

const deleteReward = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个奖励规则吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await api.delete(`/rewards/${id}`)
    ElMessage.success('奖励规则删除成功')
    loadRewards()
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
.rewards-page {
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

.header-actions {
  display: flex;
  align-items: center;
}
</style>
