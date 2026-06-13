import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  browseQuizzes:  [],      // published quizzes for the browse page
  myQuizzes:      [],      // creator's own quizzes for dashboard
  currentQuiz:    null,    // the quiz currently being taken or edited
  isLoading:      false,
  error:          null,
}

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {

    setBrowseQuizzes: (state, action) => {
      state.browseQuizzes = action.payload
    },

    setMyQuizzes: (state, action) => {
      state.myQuizzes = action.payload
    },

    setCurrentQuiz: (state, action) => {
      state.currentQuiz = action.payload
    },

    addQuizToMyList: (state, action) => {
      state.myQuizzes.unshift(action.payload)
    },

    updateQuizInMyList: (state, action) => {
      const idx = state.myQuizzes.findIndex((q) => q._id === action.payload._id)
      if (idx !== -1) state.myQuizzes[idx] = action.payload
    },

    removeQuizFromMyList: (state, action) => {
      state.myQuizzes = state.myQuizzes.filter((q) => q._id !== action.payload)
    },

    setQuizLoading: (state, action) => {
      state.isLoading = action.payload
    },

    setQuizError: (state, action) => {
      state.error     = action.payload
      state.isLoading = false
    },

    clearQuizError: (state) => {
      state.error = null
    },
  },
})

export const {
  setBrowseQuizzes,
  setMyQuizzes,
  setCurrentQuiz,
  addQuizToMyList,
  updateQuizInMyList,
  removeQuizFromMyList,
  setQuizLoading,
  setQuizError,
  clearQuizError,
} = quizSlice.actions

export default quizSlice.reducer