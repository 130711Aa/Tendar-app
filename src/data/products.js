// Sample product data (used as fallback if Supabase is not yet set up)
export const sampleProducts = [
    {
        id: 1,
        name: 'Sunset Citric Burst',
        description: 'Jeruk segar, jahe, & madu',
        price: 18000,
        category: 'Jus Segar',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqC64hGFlJPn8n6pLNpVG_cY0TFAUvfeH1uTwXGpLdFpvCP4yXYLqWk0wmKc0lZWeqAD6cstc1hzsy0VahT1dG5Wf_YPJkbErQwLs5hgbZ6xyhucngo147c7WPJdA4uZGPk9oDz6gU_6514ZKbzhjjG2o7PKlqtDVmuUxEj0z7U8jkspxED85IUyXGltkhBt15I6yfno793oROtt1blCY9pQ5c3hoMQSxWsFG_ITlhLB0RRcggFXYN03gDWJ24WbvtW71R56Jwerw'
    },
    {
        id: 2,
        name: 'Creamy Avocado Bliss',
        description: 'Alpukat, susu kental manis, & almond',
        price: 22000,
        category: 'Smoothies',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLqV3z6EJ0plfxbSOxfHM9SErqjNa87OyD7YlUif4baKv8PPaqAhUfRgPMpzEzQL8FREd8iu8XNHXqwyHFEfrljmJO_n6jRni8U5ddoeNcrikr2FkCieA8zXoQRuAa9RI0UoDDm5OgD3kJzNQ3NrZrRFQa2aFU9-TkL_WO_I7TnA6pi3i_DclqgEUyxxQeg_2LIizALO6agcG3DiLlIYrhjUWwqxtofThAkAbDZEFSjNQLZbmwjtdhMiaI2ky4957Wd4-xqq5ORfw'
    },
    {
        id: 3,
        name: 'Ruby Watermelon Cooler',
        description: 'Semangka, jeruk nipis, & daun mint',
        price: 15000,
        category: 'Mocktails',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk1LWjoyKRnpwVz-q-wiKcr_lcK9tugOKXryRM-R4HLRizepIBHs5nxy4Tmm0tu4WUCjNc19Afftjb_EZ3RYQ4r08l1CAVHaV_ZSSsHh656zQ6SpKX4ZU_alhPj8_SoUxU4L_G2u5h5K41DVAKCwStC4KeybIJpT6p3lMtYiqQ8g01PdujC-5ozFYCf32Q5u_llIiHq_JB76CRJ58xsCUbj_q2YJsHxxBS61_-7X63D-SmFcHPqs0F9wgrWzt__TsaoN1t9PzD8xY'
    },
    {
        id: 4,
        name: 'Midnight Berry Acai',
        description: 'Acai, blueberry, & yogurt vanilla',
        price: 25000,
        category: 'Smoothies',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCs8zBgiilaiA8QdAfMGYkuqg9Fi1_K228lwsVE3MrXdfGVIZ-BG0JjjwiXhLxDMwZgkbJIDvWrg_J7Xnj97jDg6E4VJtb0KtrahNmv4d7Gpo7x3NH8InfVW2ra2kV9TXMYLVUuHCngotCNu-p6GZ22NTnk_PdfFvPWNaxGEz5tReCr49roY8zALC79W0as2MSbhStWaCKtBADAROSI_xElilmqabguMrvwXEtPfCKn93__ZmkeaRFhgiVNKs1Uh28mpBxDrH7ftIk'
    },
    {
        id: 5,
        name: 'Mango Splash',
        description: 'Mangga harum manis, susu, & es',
        price: 17000,
        category: 'Jus Segar',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWn41BxMKOt1kAQf7CQFG6N91VIpfeOurECay13WpYwaPzudjzfuP5zQrIrFcSiCS-c9WswKBgDn1-8rCmHSxOoo6cInTEL5YnkNj22Rf36SN7m9nv6cs1E_IAPHWCX2PCgK9wBXCMTumjGnUTwpHigGOgHYjSXUrAzHSbJYxSzdMmtpEQe1UrKpmDA1Sve7XVAW1gMZ42IAmWCS15qX3eADDRwfTNNJ0LvOgCPJ3zJOTrugy23w2tlEyFpoG1qx6yBtUuhnWB-yU'
    },
    {
        id: 6,
        name: 'Tropical Twist',
        description: 'Nanas, kelapa muda, & madu',
        price: 20000,
        category: 'Mocktails',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqC64hGFlJPn8n6pLNpVG_cY0TFAUvfeH1uTwXGpLdFpvCP4yXYLqWk0wmKc0lZWeqAD6cstc1hzsy0VahT1dG5Wf_YPJkbErQwLs5hgbZ6xyhucngo147c7WPJdA4uZGPk9oDz6gU_6514ZKbzhjjG2o7PKlqtDVmuUxEj0z7U8jkspxED85IUyXGltkhBt15I6yfno793oROtt1blCY9pQ5c3hoMQSxWsFG_ITlhLB0RRcggFXYN03gDWJ24WbvtW71R56Jwerw'
    },
    {
        id: 7,
        name: 'Green Detox Power',
        description: 'Bayam, apel hijau, mentimun, & lemon',
        price: 19000,
        category: 'Jus Segar',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLqV3z6EJ0plfxbSOxfHM9SErqjNa87OyD7YlUif4baKv8PPaqAhUfRgPMpzEzQL8FREd8iu8XNHXqwyHFEfrljmJO_n6jRni8U5ddoeNcrikr2FkCieA8zXoQRuAa9RI0UoDDm5OgD3kJzNQ3NrZrRFQa2aFU9-TkL_WO_I7TnA6pi3i_DclqgEUyxxQeg_2LIizALO6agcG3DiLlIYrhjUWwqxtofThAkAbDZEFSjNQLZbmwjtdhMiaI2ky4957Wd4-xqq5ORfw'
    },
    {
        id: 8,
        name: 'Strawberry Yogurt Shake',
        description: 'Stroberi segar, yogurt, & granola',
        price: 23000,
        category: 'Smoothies',
        stock_status: true,
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk1LWjoyKRnpwVz-q-wiKcr_lcK9tugOKXryRM-R4HLRizepIBHs5nxy4Tmm0tu4WUCjNc19Afftjb_EZ3RYQ4r08l1CAVHaV_ZSSsHh656zQ6SpKX4ZU_alhPj8_SoUxU4L_G2u5h5K41DVAKCwStC4KeybIJpT6p3lMtYiqQ8g01PdujC-5ozFYCf32Q5u_llIiHq_JB76CRJ58xsCUbj_q2YJsHxxBS61_-7X63D-SmFcHPqs0F9wgrWzt__TsaoN1t9PzD8xY'
    },
]

export const categories = ['Semua', 'Jus Segar', 'Smoothies', 'Mocktails']
