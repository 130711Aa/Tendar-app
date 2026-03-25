import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught:', error, info)
        }
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#fcfaf8] flex items-center justify-center p-6">
                    <div className="text-center max-w-md">
                        <span className="material-symbols-outlined text-6xl text-[#ff8c00] mb-4 block">
                            error_outline
                        </span>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Oops! Terjadi Kesalahan
                        </h1>
                        <p className="text-slate-500 mb-6">
                            Aplikasi mengalami masalah. Silakan coba muat ulang halaman.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <pre className="text-left bg-red-50 text-red-700 p-4 rounded-xl text-xs mb-6 overflow-auto max-h-40 border border-red-200">
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <button
                            onClick={this.handleReload}
                            className="px-6 py-3 bg-[#ff8c00] text-white font-bold rounded-xl hover:bg-[#e67e00] transition-colors shadow-lg shadow-[#ff8c00]/20"
                        >
                            <span className="material-symbols-outlined text-sm align-middle mr-1">refresh</span>
                            Muat Ulang
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
