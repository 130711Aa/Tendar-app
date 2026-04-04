export function BrandIcon({ className = "w-8 h-8", style }) {
    return (
        <img src="/Logo.png" alt="Tendar Logo" className={`object-contain ${className}`} style={style} />
    )
}

export function BrandLogo({ className = "flex items-center gap-2", iconSize = "w-8 h-8", textSize = "text-xl", withText = true }) {
    return (
        <div className={className}>
            <div className="text-[#ff8c00]">
                <BrandIcon className={iconSize} />
            </div>
            {withText && <span className={`font-black tracking-tight text-[#181510] ${textSize}`}>Tendar</span>}
        </div>
    )
}
