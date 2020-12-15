import axios from 'axios'

let API_URL = process.env.VUE_APP_API_URL

if (process.env.NODE_ENV === 'production') {
  API_URL = '{{ API_URL }}'
}

const base = `${API_URL}/api/v1`

const API = axios.create({
  baseURL: base
})

export default API
