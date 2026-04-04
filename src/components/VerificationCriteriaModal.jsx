import { useState } from 'react'
import { X } from 'lucide-react'

const LaptopIllustration = () => (
    <div className="flex justify-center w-full my-6 select-none">
        <svg width="340" height="240" viewBox="0 0 340 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background Shape */}
            <path d="M70 170C30 130 50 60 140 40C230 20 310 60 300 130C290 200 210 230 130 210C100 202 85 185 70 170Z" fill="#135AA1" opacity="0.9"/>
            
            {/* Laptop Screen Lid */}
            <rect x="60" y="55" width="220" height="140" rx="8" fill="#1C1C1C"/>
            {/* Inner Bezels */}
            <rect x="65" y="60" width="210" height="135" fill="white" />
            
            {/* Browser Header */}
            <rect x="65" y="60" width="210" height="20" fill="#1CA1D4"/>
            {/* URL Box */}
            <rect x="120" y="65" width="100" height="10" rx="5" fill="white"/>
            <text x="170" y="73" fill="#1CA1D4" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">www.cocostore.com</text>
            
            {/* Window Controls */}
            <circle cx="250" cy="70" r="2.5" fill="white"/>
            <circle cx="258" cy="70" r="2.5" fill="white"/>
            <circle cx="266" cy="70" r="2.5" fill="white"/>

            {/* Browser Body Content */}
            <text x="170" y="105" fill="#9CA3AF" fontSize="16" fontWeight="bold" fontFamily="serif" textAnchor="middle">Contact Us</text>
            
            {/* Phone Icon & Text */}
            <g transform="translate(112, 115) scale(0.9)">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#1CA1D4"/>
            </g>
            <text x="136" y="130" fill="#9CA3AF" fontSize="13.5" fontWeight="bold" fontFamily="sans-serif">021 - 4251234</text>
            
            {/* Text lines (skeleton) */}
            <rect x="95" y="148" width="150" height="4.5" rx="2.25" fill="#E5E7EB"/>
            <rect x="95" y="160" width="120" height="4.5" rx="2.25" fill="#E5E7EB"/>
            <rect x="95" y="172" width="135" height="4.5" rx="2.25" fill="#E5E7EB"/>
            
            {/* Laptop Base Hinge */}
            <rect x="60" y="195" width="220" height="3" fill="#333333"/>
            
            {/* Keyboard Deck / Base Panel */}
            <path d="M30 198 L310 198 L325 212 C325 216 320 220 310 220 L30 220 C20 220 15 216 15 212 L30 198 Z" fill="#27272A"/>
            
            {/* Opening Notch */}
            <rect x="155" y="198" width="30" height="2" rx="1" fill="#111111"/>
            
            {/* Front Lip / Shadow */}
            <rect x="15" y="217" width="310" height="4" rx="2" fill="#111111"/>
        </svg>
    </div>
)

const steps = [
    {
        title: 'Kriteria website yang diterima',
        description: 'Pastikan website Anda dapat diakses tanpa kendala.',
        illustration: <div className="h-[240px] flex items-center justify-center p-6"><div className="w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center"><span className="material-symbols-outlined text-blue-500 text-6xl">language</span></div></div>
    },
    {
        title: 'Kriteria website yang diterima',
        description: 'Ada informasi kontak bisnis yang bisa dihubungi.',
        illustration: <LaptopIllustration />
    },
    {
        title: 'Kriteria website yang diterima',
        description: 'Produk/menu memiliki nama, harga, dan gambar yang jelas.',
        illustration: <div className="h-[240px] flex items-center justify-center p-6"><div className="w-32 h-32 rounded-full bg-orange-50 flex items-center justify-center"><span className="material-symbols-outlined text-orange-500 text-6xl">fastfood</span></div></div>
    },
    {
        title: 'Kriteria website yang diterima',
        description: 'Deskripsikan profil atau alamat toko agar pelanggan mudah mengenali.',
        illustration: <div className="h-[240px] flex items-center justify-center p-6"><div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center"><span className="material-symbols-outlined text-emerald-500 text-6xl">store</span></div></div>
    }
]

export default function VerificationCriteriaModal({ isOpen, onClose }) {
    // Force starting at index 1 to match the visual context of the requested implementation (the laptop illustration is the 2nd dot).
    const [currentStep, setCurrentStep] = useState(1)

    if (!isOpen) return null

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            onClose()
            setCurrentStep(1)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const step = steps[currentStep]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-[Inter,sans-serif]">
            <div className="bg-white rounded border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up relative">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-700 hover:text-slate-900 z-10 transition-colors p-1"
                >
                    <X size={20} strokeWidth={2.5}/>
                </button>

                <div className="p-10 flex flex-col items-center">
                    <div className="w-full text-left">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">
                            {step.title}
                        </h2>

                        <p className="text-slate-700 text-base mb-8 min-h-[24px]">
                            {step.description}
                        </p>
                    </div>

                    {/* Illustration Area */}
                    <div className="w-full mb-8">
                        {step.illustration}
                    </div>

                    {/* Navigation Container */}
                    <div className="w-full flex flex-col items-center gap-10 mt-2">
                        {/* Indicators */}
                        <div className="flex justify-center gap-2">
                            {steps.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        idx === currentStep 
                                            ? 'bg-[#0E52A0]' 
                                            : 'bg-slate-200'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex w-full justify-between mt-auto border-t border-slate-100 pt-6">
                            <button
                                onClick={handlePrev}
                                disabled={currentStep === 0}
                                className={`px-10 py-2.5 rounded-[4px] font-bold text-sm border-2 transition-colors ${
                                    currentStep === 0 
                                        ? 'border-slate-200 text-slate-400 opacity-50 cursor-not-allowed' 
                                        : 'border-[#0E52A0] text-[#0E52A0] hover:bg-blue-50'
                                }`}
                            >
                                Kembali
                            </button>
                            
                            <button
                                onClick={handleNext}
                                className="px-10 py-2.5 rounded-[4px] font-bold text-sm bg-[#0E52A0] text-white hover:bg-[#0c468a] transition-colors"
                            >
                                {currentStep === steps.length - 1 ? 'Selesai' : 'Lanjut'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
