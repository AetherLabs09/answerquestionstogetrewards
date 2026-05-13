<template>
  <div class="questions-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span>题库管理</span>
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
              新增题目
            </el-button>
            <el-button @click="showBatchDialog" :disabled="!selectedActivity">
              批量导入
            </el-button>
            <el-button @click="checkDuplicate" :disabled="!selectedActivity">
              查重
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="questions" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="type" label="题型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">
              {{ getTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="题目内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="answer" label="答案" width="100" />
        <el-table-column prop="score" label="分值" width="80" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteQuestion(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑题目' : '新增题目'" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="题目分类">
          <el-input v-model="form.category" placeholder="请输入题目分类" />
        </el-form-item>
        <el-form-item label="题型" required>
          <el-select v-model="form.type" placeholder="请选择题型">
            <el-option label="单选题" value="single" />
            <el-option label="多选题" value="multiple" />
            <el-option label="判断题" value="judge" />
          </el-select>
        </el-form-item>
        <el-form-item label="题目内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="3"
            placeholder="请输入题目内容"
          />
        </el-form-item>
        <el-form-item label="选项" v-if="form.type !== 'judge'">
          <div v-for="(option, index) in form.options" :key="index" class="option-item">
            <el-input v-model="form.options[index]" :placeholder="'选项' + String.fromCharCode(65 + index)">
              <template #prepend>{{ String.fromCharCode(65 + index) }}</template>
            </el-input>
            <el-button v-if="form.options.length > 2" type="danger" @click="removeOption(index)" circle>
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button @click="addOption" v-if="form.options.length < 6">添加选项</el-button>
        </el-form-item>
        <el-form-item label="正确答案" required>
          <el-select v-model="form.answer" placeholder="请选择正确答案" :multiple="form.type === 'multiple'">
            <el-option
              v-for="(option, index) in answerOptions"
              :key="index"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="答案解析">
          <el-input
            v-model="form.explanation"
            type="textarea"
            :rows="3"
            placeholder="请输入答案解析"
          />
        </el-form-item>
        <el-form-item label="分值">
          <el-input-number v-model="form.score" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="启用" value="active" />
            <el-option label="下架" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveQuestion">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchDialogVisible" title="批量导入题目" width="700px">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px">
        <p>批量导入格式说明：</p>
        <p>每行一道题目，格式：题型|分类|题目内容|选项A,选项B,选项C,选项D|答案|解析|分值</p>
        <p>题型：single(单选)、multiple(多选)、judge(判断)</p>
        <p>判断题选项留空，答案填写：正确 或 错误</p>
        <p>多选题答案用逗号分隔，如：A,B,C</p>
      </el-alert>
      <el-input
        v-model="batchContent"
        type="textarea"
        :rows="10"
        placeholder="请按照格式输入题目内容"
      />
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="importBatch">导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="duplicateDialogVisible" title="重复题目检查" width="700px">
      <el-table :data="duplicates" style="width: 100%">
        <el-table-column prop="content" label="题目内容" />
        <el-table-column prop="count" label="重复次数" width="120" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'

const loading = ref(false)
const activities = ref([])
const questions = ref([])
const selectedActivity = ref(null)
const dialogVisible = ref(false)
const batchDialogVisible = ref(false)
const duplicateDialogVisible = ref(false)
const isEdit = ref(false)
const batchContent = ref('')
const duplicates = ref([])

const form = ref({
  category: '',
  type: 'single',
  content: '',
  options: ['', '', '', ''],
  answer: '',
  explanation: '',
  score: 10,
  status: 'active'
})

const answerOptions = computed(() => {
  if (form.value.type === 'judge') {
    return ['正确', '错误']
  }
  return form.value.options.map((_, index) => String.fromCharCode(65 + index))
})

const getTypeName = (type) => {
  const types = { single: '单选', multiple: '多选', judge: '判断' }
  return types[type] || type
}

const getTypeTag = (type) => {
  const tags = { single: 'primary', multiple: 'success', judge: 'warning' }
  return tags[type] || 'info'
}

const loadActivities = async () => {
  try {
    activities.value = await api.get('/activities')
  } catch (error) {
    console.error(error)
  }
}

const loadQuestions = async () => {
  if (!selectedActivity.value) return
  loading.value = true
  try {
    questions.value = await api.get(`/questions/activity/${selectedActivity.value}`)
  } finally {
    loading.value = false
  }
}

const showDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    form.value = {
      ...row,
      options: JSON.parse(row.options || '[]'),
      answer: row.type === 'multiple' ? row.answer.split(',') : row.answer
    }
  } else {
    form.value = {
      category: '',
      type: 'single',
      content: '',
      options: ['', '', '', ''],
      answer: '',
      explanation: '',
      score: 10,
      status: 'active'
    }
  }
  dialogVisible.value = true
}

const addOption = () => {
  if (form.value.options.length < 6) {
    form.value.options.push('')
  }
}

const removeOption = (index) => {
  form.value.options.splice(index, 1)
}

const saveQuestion = async () => {
  try {
    const data = {
      ...form.value,
      activity_id: selectedActivity.value,
      answer: Array.isArray(form.value.answer) ? form.value.answer.join(',') : form.value.answer
    }
    
    if (isEdit.value) {
      await api.put(`/questions/${form.value.id}`, data)
      ElMessage.success('题目更新成功')
    } else {
      await api.post('/questions', data)
      ElMessage.success('题目创建成功')
    }
    
    dialogVisible.value = false
    loadQuestions()
  } catch (error) {
    console.error(error)
  }
}

const deleteQuestion = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这道题目吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await api.delete(`/questions/${id}`)
    ElMessage.success('题目删除成功')
    loadQuestions()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const showBatchDialog = () => {
  batchContent.value = ''
  batchDialogVisible.value = true
}

const importBatch = async () => {
  try {
    const lines = batchContent.value.trim().split('\n')
    const questions = lines.map(line => {
      const parts = line.split('|')
      const type = parts[0]
      const options = type === 'judge' ? [] : (parts[3] || '').split(',')
      return {
        category: parts[1] || '',
        type: parts[0],
        content: parts[2],
        options: options,
        answer: parts[4],
        explanation: parts[5] || '',
        score: parseInt(parts[6]) || 10
      }
    })
    
    await api.post('/questions/batch', {
      activity_id: selectedActivity.value,
      questions
    })
    
    ElMessage.success('批量导入成功')
    batchDialogVisible.value = false
    loadQuestions()
  } catch (error) {
    console.error(error)
  }
}

const checkDuplicate = async () => {
  try {
    duplicates.value = await api.get(`/questions/check-duplicate/${selectedActivity.value}`)
    duplicateDialogVisible.value = true
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.questions-page {
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

.option-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.option-item .el-input {
  flex: 1;
}
</style>
