import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, Users, Activity } from 'lucide-react'

export default function KPICard({ title, value, subtext, iconName = 'activity', trend = 'neutral', trendValue }) {
    const icons = {
        dollar: <DollarSign className="w-5 h-5 text-emerald-600" />,
        bag: <ShoppingBag className="w-5 h-5 text-blue-600" />,
        users: <Users className="w-5 h-5 text-purple-600" />,
        activity: <Activity className="w-5 h-5 text-orange-600" />
    }

    const trends = {
        up: <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />,
        down: <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />,
        neutral: null
    }

    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-stone-100 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-stone-50 rounded-xl">
                    {icons[iconName] || icons.activity}
                </div>
                {trend !== 'neutral' && trendValue !== undefined && (
                    <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {trends[trend]}
                        <span>{trendValue}%</span>
                    </div>
                )}
            </div>

            <h3 className="text-stone-500 text-sm font-medium mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-stone-800 tracking-tight">{value}</span>
                {subtext && <span className="text-xs text-stone-400 font-medium">{subtext}</span>}
            </div>
        </div>
    )
}
