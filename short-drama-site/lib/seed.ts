import type { Drama, Platform, Submission } from "@/lib/types";

export const platforms: Platform[] = [
  { id: "youtube", slug: "youtube", name: "YouTube", domain: "youtube.com", color: "#e33b32", offlineNote: "部分内容可通过 YouTube Premium 在官方应用内离线观看。" },
  { id: "reelshort", slug: "reelshort", name: "ReelShort", domain: "reelshort.com", color: "#d94f45", offlineNote: "请以 ReelShort 官方应用当前提供的离线能力为准。" },
  { id: "dramabox", slug: "dramabox", name: "DramaBox", domain: "dramabox.com", color: "#c8433a", offlineNote: "请在 DramaBox 官方应用内查看缓存与离线选项。" },
  { id: "netshort", slug: "netshort", name: "NetShort", domain: "netshort.com", color: "#b93831", offlineNote: "请在 NetShort 官方应用内查看可用的离线方式。" },
  { id: "shortmax", slug: "shortmax", name: "ShortMax", domain: "shortmax.app", color: "#d94f45", offlineNote: "请以 ShortMax 官方应用当前提供的离线能力为准。" },
  { id: "goodshort", slug: "goodshort", name: "GoodShort", domain: "goodshort.com", color: "#c8433a", offlineNote: "请以 GoodShort 官方应用当前提供的离线能力为准。" },
  { id: "flextv", slug: "flextv", name: "FlexTV", domain: "flextv.cc", color: "#b93831", offlineNote: "请以 FlexTV 官方应用当前提供的离线能力为准。" }
  ,{ id: "dailymotion", slug: "dailymotion", name: "Dailymotion", domain: "dailymotion.com", color: "#d94f45", offlineNote: "仅展示 Dailymotion 官方页面提供的观看或离线选项。" }
  ,{ id: "tiktok", slug: "tiktok", name: "TikTok", domain: "tiktok.com", color: "#c8433a", offlineNote: "仅展示 TikTok 官方应用当前允许的保存或离线观看选项。" }
];

const checkedAt = "2026-07-07T08:00:00.000Z";

export const dramas: Drama[] = [
  {
    id: "d6", slug: "the-lions-captive", titleZh: "狮王的囚徒", titleEn: "The Lion's Captive",
    aliases: ["The Lions Captive", "Lion's Captive", "狮子的俘虏"], synopsis: "怀有秘密身孕的 Elena 被迫嫁给冷酷的 Kane 王子，并在残酷帝国中设法保住自己和孩子。", posterUrl: "https://picsum.photos/seed/the-lions-captive-short-drama/900/1200", episodeCount: 29,
    languages: ["en"], regions: ["Global"], trendingScore: 99, updatedAt: checkedAt,
    resources: []
  },
  {
    id: "d1", slug: "the-double-life-of-my-billionaire-husband", titleZh: "亿万富翁丈夫的双面人生", titleEn: "The Double Life of My Billionaire Husband",
    aliases: ["我的亿万富豪老公", "Billionaire Husband"], synopsis: "一场仓促的婚姻，让两个隐藏身份的人被迫重新认识彼此。", posterUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80", episodeCount: 50,
    languages: ["en", "zh"], regions: ["US", "Global"], trendingScore: 98, updatedAt: checkedAt,
    resources: []
  },
  {
    id: "d2", slug: "fated-to-my-forbidden-alpha", titleZh: "命中注定的禁忌阿尔法", titleEn: "Fated to My Forbidden Alpha",
    aliases: ["Forbidden Alpha", "禁忌之恋"], synopsis: "被放逐的年轻女子卷入狼族继承人与旧誓言之间的危险纠葛。", posterUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", episodeCount: 63,
    languages: ["en"], regions: ["US", "Global"], trendingScore: 92, updatedAt: checkedAt,
    resources: []
  },
  {
    id: "d3", slug: "never-divorce-a-secret-billionaire-heiress", titleZh: "不要和隐形千金离婚", titleEn: "Never Divorce a Secret Billionaire Heiress",
    aliases: ["Secret Heiress", "隐形千金"], synopsis: "一纸离婚协议揭开了妻子隐藏多年的家族身份，也让前夫开始追悔。", posterUrl: "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?auto=format&fit=crop&w=900&q=80", episodeCount: 72,
    languages: ["en", "zh"], regions: ["Global"], trendingScore: 88, updatedAt: checkedAt,
    resources: []
  },
  {
    id: "d4", slug: "the-ceos-mute-bride", titleZh: "总裁的哑巴新娘", titleEn: "The CEO's Mute Bride",
    aliases: ["Mute Bride", "哑妻"], synopsis: "沉默的新娘带着自己的秘密进入豪门，在误解与权力之间寻找出口。", posterUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80", episodeCount: 61,
    languages: ["en", "zh"], regions: ["Global"], trendingScore: 83, updatedAt: checkedAt,
    resources: []
  },
  {
    id: "d5", slug: "goodbye-my-ceo", titleZh: "再见，我的总裁", titleEn: "Goodbye, My CEO",
    aliases: ["Farewell CEO", "再见总裁"], synopsis: "当一段失衡的关系终于结束，旧爱才发现被忽略的真相。", posterUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80", episodeCount: 45,
    languages: ["en"], regions: ["Global"], trendingScore: 76, updatedAt: checkedAt,
    resources: []
  }
];

export const demoSubmissions: Submission[] = [
  { id: "s1", url: "https://www.youtube.com/@ReelShortApp", title: "ReelShort 官方频道", note: "频道资源补充", contact: "editor@example.com", status: "pending", createdAt: checkedAt }
];
