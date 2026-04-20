import { Component, type ErrorInfo, type ReactNode } from "react"

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

function isRecoverableDomMutationError(error: unknown): boolean {
  return error instanceof Error
    && error.name === "NotFoundError"
    && error.message.includes("removeChild")
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState | null {
    if (isRecoverableDomMutationError(error)) {
      return null
    }

    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isRecoverableDomMutationError(error)) {
      console.warn("Error recuperable del DOM ignorado en la interfaz", error, errorInfo)
      return
    }

    console.error("Error no controlado en la interfaz", error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              !
            </div>
            <h1 className="text-lg font-bold text-gray-900">Se produjo un error en la interfaz</h1>
            <p className="mt-2 text-sm text-gray-600">
              La aplicación encontró un problema inesperado al renderizar la pantalla.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}