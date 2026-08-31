import { AxiosError } from 'axios'

interface ApiErrorBody {
  message?: string
  errors?: { field: string; message: string }[]
}

export function getApiErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.'): string {
  const axiosError = err as AxiosError<ApiErrorBody>
  const body = axiosError.response?.data
  if (body?.errors?.length) {
    return body.errors.map((e) => e.message).join(', ')
  }
  return body?.message ?? fallback
}
