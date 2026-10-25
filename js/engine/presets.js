/**
 * Real-World Startup Financial Model Presets
 * Verified benchmark templates across 5 distinct digital business models.
 */

export const INDUSTRY_PRESETS = {
  ai_micro_saas: {
    id: 'ai_micro_saas',
    name: 'AI Micro-SaaS',
    icon: '🚀',
    tagline: 'Solo Hacker • Viral Acquisition • High Margin',
    startingCash: 35000,
    currentMRR: 4500,
    monthlyGrowthRate: 0.14,
    monthlyOpEx: 1800,
    headcount: [
      { id: 'h1', role: 'Founder Fullstack Dev', monthlySalary: 3000, startMonth: 1 },
      { id: 'h2', role: 'Contract AI Ops Engineer', monthlySalary: 2500, startMonth: 4 }
    ],
    unitEconomics: {
      cac: 120,
      arpu: 49,
      grossMarginPct: 92,
      monthlyChurnPct: 4.2,
      smSpend: 4000,
      netARR: 12000,
      annualGrowth: 120,
      fcfMargin: 15
    }
  },

  b2b_enterprise: {
    id: 'b2b_enterprise',
    name: 'B2B Enterprise SaaS',
    icon: '🏢',
    tagline: 'Seed Stage • High LTV • Dedicated Sales',
    startingCash: 750000,
    currentMRR: 28000,
    monthlyGrowthRate: 0.075,
    monthlyOpEx: 12000,
    headcount: [
      { id: 'h1', role: 'Lead Architect', monthlySalary: 9000, startMonth: 1 },
      { id: 'h2', role: 'Enterprise Account Exec', monthlySalary: 6500, startMonth: 2 },
      { id: 'h3', role: 'Customer Success Manager', monthlySalary: 5500, startMonth: 4 },
      { id: 'h4', role: 'Senior Backend Engineer', monthlySalary: 8000, startMonth: 6 }
    ],
    unitEconomics: {
      cac: 3200,
      arpu: 450,
      grossMarginPct: 82,
      monthlyChurnPct: 1.1,
      smSpend: 35000,
      netARR: 65000,
      annualGrowth: 65,
      fcfMargin: -8
    }
  },

  consumer_mobile: {
    id: 'consumer_mobile',
    name: 'Consumer Mobile App',
    icon: '📱',
    tagline: 'In-App Subscriptions • Paid UA Funnel',
    startingCash: 120000,
    currentMRR: 9200,
    monthlyGrowthRate: 0.105,
    monthlyOpEx: 5500,
    headcount: [
      { id: 'h1', role: 'Lead iOS/Android Dev', monthlySalary: 7500, startMonth: 1 },
      { id: 'h2', role: 'Performance UA Specialist', monthlySalary: 5000, startMonth: 3 }
    ],
    unitEconomics: {
      cac: 38,
      arpu: 12.99,
      grossMarginPct: 72,
      monthlyChurnPct: 5.8,
      smSpend: 18000,
      netARR: 28000,
      annualGrowth: 85,
      fcfMargin: -4
    }
  },

  bootstrapped_profitable: {
    id: 'bootstrapped_profitable',
    name: 'Bootstrapped Default Alive',
    icon: '🛡️',
    tagline: 'Lean Team • Profitable • Zero VC Dilution',
    startingCash: 180000,
    currentMRR: 42000,
    monthlyGrowthRate: 0.05,
    monthlyOpEx: 6500,
    headcount: [
      { id: 'h1', role: 'Founder & CEO', monthlySalary: 5000, startMonth: 1 },
      { id: 'h2', role: 'Senior Fullstack Dev', monthlySalary: 7000, startMonth: 1 },
      { id: 'h3', role: 'Growth Marketer', monthlySalary: 4500, startMonth: 2 }
    ],
    unitEconomics: {
      cac: 480,
      arpu: 89,
      grossMarginPct: 88,
      monthlyChurnPct: 1.9,
      smSpend: 8000,
      netARR: 22000,
      annualGrowth: 45,
      fcfMargin: 18
    }
  },

  venture_hypergrowth: {
    id: 'venture_hypergrowth',
    name: 'Series A Hypergrowth',
    icon: '🦄',
    tagline: 'Institutional Backing • Aggressive Expansion',
    startingCash: 2800000,
    currentMRR: 95000,
    monthlyGrowthRate: 0.085,
    monthlyOpEx: 42000,
    headcount: [
      { id: 'h1', role: 'VP of Engineering', monthlySalary: 12000, startMonth: 1 },
      { id: 'h2', role: 'Staff Backend Engineer', monthlySalary: 8500, startMonth: 1 },
      { id: 'h3', role: 'Enterprise Sales Lead', monthlySalary: 8000, startMonth: 2 },
      { id: 'h4', role: 'Product Lead', monthlySalary: 7500, startMonth: 3 },
      { id: 'h5', role: 'Site Reliability / DevOps', monthlySalary: 8500, startMonth: 5 }
    ],
    unitEconomics: {
      cac: 1800,
      arpu: 199,
      grossMarginPct: 84,
      monthlyChurnPct: 1.6,
      smSpend: 75000,
      netARR: 140000,
      annualGrowth: 95,
      fcfMargin: -15
    }
  }
};
