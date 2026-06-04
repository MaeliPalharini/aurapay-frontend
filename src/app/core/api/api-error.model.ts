// Formato de erro padronizado devolvido pelo backend do AuraPay.
export interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  timestamp: string;
}
