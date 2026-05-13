import { createRouter, createWebHistory } from 'vue-router'
import Activities from '../views/Activities.vue'
import Questions from '../views/Questions.vue'
import Quiz from '../views/Quiz.vue'
import Rewards from '../views/Rewards.vue'

const routes = [
  {
    path: '/',
    redirect: '/activities'
  },
  {
    path: '/activities',
    name: 'Activities',
    component: Activities
  },
  {
    path: '/questions',
    name: 'Questions',
    component: Questions
  },
  {
    path: '/quiz',
    name: 'Quiz',
    component: Quiz
  },
  {
    path: '/rewards',
    name: 'Rewards',
    component: Rewards
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
