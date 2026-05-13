<template>
  <div class="quiz-page">
    <el-card class="page-card" v-if="!quizStarted">
      <template #header>
        <div class="card-header">
          <span>在线答题</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="答题规则设置" name="rules">
          <el-form :model="rulesForm" label-width="150px" style="max-width: 600px">
            <el-form-item label="选择活动">
              <el-select v-model="rulesForm.activity_id" placeholder="请选择活动" @change="loadRules">
                <el-option
                  v-for="activity in activities"
                  :key="activity.id"
                  :label="activity.name"
                  :value="activity.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="每次答题题量">
              <el-input-number v-model="rulesForm.question_count" :min="1" :max="50" />
            </el-form-item>
            <el-form-item label="答题限时(秒)">
              <el-input-number v-model="rulesForm.time_limit" :min="60" :max="3600" :step="60" />
            </el-form-item>
            <el-form-item label="每日答题次数">
              <el-input-number v-model="rulesForm.daily_attempts" :min="1" :max="10" />
            </el-form-item>
            <el-form-item label="闯关关卡数">
              <el-input-number v-model="rulesForm.level_count" :min="1" :max="10" />
            </el-form-item>
            <el-form-item label="通关分数标准">
              <el-input-number v-model="rulesForm.passing_score" :min="0" :max="100" :step="10" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveRules">保存规则</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="开始答题" name="start">
          <div class="start-quiz">
            <el-form :model="startForm" label-width="100px" style="max-width: 400px">
              <el-form-item label="用户ID">
                <el-input v-model="startForm.user_id" placeholder="请输入用户ID" />
              </el-form-item>
              <el-form-item label="选择活动">
                <el-select v-model="startForm.activity_id" placeholder="请选择活动">
                  <el-option
                    v-for="activity in activities"
                    :key="activity.id"
                    :label="activity.name"
                    :value="activity.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="large" @click="startQuiz" :disabled="!startForm.user_id || !startForm.activity_id">
                  开始答题
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="答题历史" name="history">
          <el-table :data="history" style="width: 100%" v-loading="historyLoading">
            <el-table-column prop="activity_name" label="活动名称" width="200" />
            <el-table-column prop="total_score" label="得分" width="100" />
            <el-table-column prop="correct_count" label="正确数" width="100" />
            <el-table-column prop="total_questions" label="总题数" width="100" />
            <el-table-column prop="accuracy" label="正确率" width="100">
              <template #default="{ row }">
                {{ row.accuracy }}%
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'completed' ? 'success' : 'warning'">
                  {{ row.status === 'completed' ? '已完成' : '进行中' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="started_at" label="开始时间" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-card class="quiz-card" v-if="quizStarted">
      <div class="quiz-header">
        <div class="quiz-info">
          <span class="question-progress">题目 {{ currentQuestionIndex + 1 }} / {{ questions.length }}</span>
          <span class="time-remaining">剩余时间: {{ formatTime(remainingTime) }}</span>
        </div>
        <el-progress :percentage="progressPercentage" :stroke-width="10" />
      </div>

      <div class="question-content">
        <div class="question-type">
          <el-tag :type="getTypeTag(currentQuestion.type)">
            {{ getTypeName(currentQuestion.type) }}
          </el-tag>
          <span class="question-score">（{{ currentQuestion.score }}分）</span>
        </div>
        <h3 class="question-text">{{ currentQuestion.content }}</h3>
        
        <div class="options-list">
          <el-radio-group v-model="userAnswer" v-if="currentQuestion.type === 'single'">
            <el-radio
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              :label="String.fromCharCode(65 + index)"
              class="option-item"
            >
              {{ String.fromCharCode(65 + index) }}. {{ option }}
            </el-radio>
          </el-radio-group>

          <el-checkbox-group v-model="userAnswers" v-if="currentQuestion.type === 'multiple'">
            <el-checkbox
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              :label="String.fromCharCode(65 + index)"
              class="option-item"
            >
              {{ String.fromCharCode(65 + index) }}. {{ option }}
            </el-checkbox>
          </el-checkbox-group>

          <el-radio-group v-model="userAnswer" v-if="currentQuestion.type === 'judge'">
            <el-radio label="正确" class="option-item">正确</el-radio>
            <el-radio label="错误" class="option-item">错误</el-radio>
          </el-radio-group>
        </div>
      </div>

      <div class="quiz-actions">
        <el-button @click="prevQuestion" :disabled="currentQuestionIndex === 0">上一题</el-button>
        <el-button @click="nextQuestion" v-if="currentQuestionIndex < questions.length - 1">下一题</el-button>
        <el-button type="primary" @click="submitQuiz" v-if="currentQuestionIndex === questions.length - 1">提交答卷</el-button>
      </div>
    </el-card>

    <el-dialog v-model="resultDialogVisible" title="答题结果" width="500px" :close-on-click-modal="false">
      <div class="result-content">
        <el-result
          :icon="result.passed ? 'success' : 'warning'"
          :title="result.passed ? '恭喜通过！' : '未能通过'"
        >
          <template #sub-title>
            <div class="result-details">
              <p>总得分: {{ result.total_score }}分</p>
              <p>正确率: {{ result.accuracy }}%</p>
              <p>正确题数: {{ result.correct_count }} / {{ result.total_questions }}</p>
              <p>及格分数: {{ result.passing_score }}分</p>
            </div>
          </template>
        </el-result>
      </div>
      <template #footer>
        <el-button type="primary" @click="finishQuiz">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../utils/api'

const activeTab = ref('rules')
const activities = ref([])
const quizStarted = ref(false)
const resultDialogVisible = ref(false)
const historyLoading = ref(false)
const history = ref([])

const rulesForm = ref({
  activity_id: null,
  question_count: 10,
  time_limit: 600,
  daily_attempts: 3,
  level_count: 1,
  passing_score: 60
})

const startForm = ref({
  user_id: '',
  activity_id: null
})

const questions = ref([])
const currentQuestionIndex = ref(0)
const userAnswer = ref('')
const userAnswers = ref([])
const sessionId = ref(null)
const remainingTime = ref(0)
const timer = ref(null)
const answers = ref({})

const result = ref({
  total_score: 0,
  accuracy: 0,
  correct_count: 0,
  total_questions: 0,
  passed: false,
  passing_score: 60
})

const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || {})

const progressPercentage = computed(() => {
  if (questions.value.length === 0) return 0
  return ((currentQuestionIndex.value + 1) / questions.value.length) * 100
})

const getTypeName = (type) => {
  const types = { single: '单选题', multiple: '多选题', judge: '判断题' }
  return types[type] || type
}

const getTypeTag = (type) => {
  const tags = { single: 'primary', multiple: 'success', judge: 'warning' }
  return tags[type] || 'info'
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const loadActivities = async () => {
  try {
    activities.value = await api.get('/activities')
  } catch (error) {
    console.error(error)
  }
}

const loadRules = async () => {
  if (!rulesForm.value.activity_id) return
  try {
    const rules = await api.get(`/quiz/rules/${rulesForm.value.activity_id}`)
    rulesForm.value = { ...rulesForm.value, ...rules }
  } catch (error) {
    console.error(error)
  }
}

const saveRules = async () => {
  try {
    await api.post('/quiz/rules', rulesForm.value)
    ElMessage.success('答题规则保存成功')
  } catch (error) {
    console.error(error)
  }
}

const startQuiz = async () => {
  try {
    const response = await api.post('/quiz/start', {
      user_id: startForm.value.user_id,
      activity_id: startForm.value.activity_id
    })
    
    questions.value = response.questions
    sessionId.value = response.session_id
    remainingTime.value = response.time_limit
    quizStarted.value = true
    
    startTimer()
    ElMessage.success('答题开始，祝您好运！')
  } catch (error) {
    console.error(error)
  }
}

const startTimer = () => {
  timer.value = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      clearInterval(timer.value)
      submitQuiz()
    }
  }, 1000)
}

const prevQuestion = () => {
  saveCurrentAnswer()
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
    loadSavedAnswer()
  }
}

const nextQuestion = () => {
  saveCurrentAnswer()
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++
    loadSavedAnswer()
  }
}

const saveCurrentAnswer = () => {
  const qId = currentQuestion.value.id
  if (currentQuestion.value.type === 'multiple') {
    answers.value[qId] = userAnswers.value.join(',')
  } else {
    answers.value[qId] = userAnswer.value
  }
}

const loadSavedAnswer = () => {
  const qId = currentQuestion.value.id
  if (currentQuestion.value.type === 'multiple') {
    userAnswers.value = answers.value[qId] ? answers.value[qId].split(',') : []
  } else {
    userAnswer.value = answers.value[qId] || ''
  }
}

const submitQuiz = async () => {
  clearInterval(timer.value)
  saveCurrentAnswer()
  
  try {
    for (const [questionId, answer] of Object.entries(answers.value)) {
      await api.post('/quiz/submit-answer', {
        session_id: sessionId.value,
        question_id: questionId,
        user_answer: answer,
        time_spent: 0
      })
    }
    
    const response = await api.post('/quiz/submit', {
      session_id: sessionId.value
    })
    
    result.value = response
    resultDialogVisible.value = true
  } catch (error) {
    console.error(error)
  }
}

const finishQuiz = () => {
  quizStarted.value = false
  resultDialogVisible.value = false
  questions.value = []
  currentQuestionIndex.value = 0
  answers.value = {}
  userAnswer.value = ''
  userAnswers.value = []
  sessionId.value = null
  
  if (startForm.value.user_id) {
    loadHistory()
  }
}

const loadHistory = async () => {
  if (!startForm.value.user_id) return
  historyLoading.value = true
  try {
    history.value = await api.get(`/quiz/history/${startForm.value.user_id}`)
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  loadActivities()
})

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
})
</script>

<style scoped>
.quiz-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-card,
.quiz-card {
  border-radius: 8px;
}

.card-header span {
  font-size: 18px;
  font-weight: 600;
}

.start-quiz {
  padding: 40px 0;
  display: flex;
  justify-content: center;
}

.quiz-header {
  margin-bottom: 30px;
}

.quiz-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 600;
}

.question-content {
  padding: 30px 0;
}

.question-type {
  margin-bottom: 20px;
}

.question-score {
  margin-left: 10px;
  color: #909399;
}

.question-text {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 30px;
}

.options-list {
  padding-left: 20px;
}

.option-item {
  display: block;
  margin-bottom: 15px;
  font-size: 16px;
  line-height: 1.8;
}

.quiz-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
}

.result-content {
  text-align: center;
}

.result-details {
  font-size: 16px;
  line-height: 2;
}
</style>
