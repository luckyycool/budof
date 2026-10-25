/**
 * Frequently Asked Questions (FAQ) & Structured Schema Generator
 * Targets Google Rich Snippets and Answer Box algorithms.
 */

export const FOUNDER_FAQS = [
  {
    question: 'How is startup runway calculated, and what is a safe buffer?',
    answer: 'Startup runway measures the number of months your company can operate before its cash reserves are depleted. It is calculated as: Total Cash Balance divided by Net Monthly Burn (where Net Burn = Gross Operating Expenses minus Monthly Recurring Revenue). Top venture investors recommend maintaining at least 18 to 24 months of runway with a 20% safety margin for market volatility.'
  },
  {
    question: 'What is Paul Graham\'s "Default Alive" framework?',
    answer: 'In 2015, Y Combinator co-founder Paul Graham introduced "Default Alive vs Default Dead". A startup is Default Alive if its revenue will grow to surpass expenses before its cash reserves hit zero. If revenue growth is too slow to reach profitability before running out of cash, the startup is Default Dead and will perish unless it raises external funding or cuts burn immediately.'
  },
  {
    question: 'What is a healthy CAC Payback Period for early-stage B2B SaaS?',
    answer: 'CAC Payback Period is the number of months required to recover the cost of acquiring a customer (CAC / Monthly Gross Profit per Customer). An elite benchmark is under 12 months, allowing a company to self-fund its customer acquisition engine. A payback period of 12 to 18 months is acceptable, while over 24 months creates severe working capital constraints.'
  },
  {
    question: 'How does the SaaS Rule of 40 work, and what is an elite score?',
    answer: 'The Rule of 40 states that a software company\'s combined annual revenue growth rate percentage and free cash flow margin percentage should equal or exceed 40%. For example, a startup growing at 55% with a -10% cash burn margin scores 45%, qualifying as an elite venture-grade business that balances growth with capital efficiency.'
  },
  {
    question: 'Why should founders apply a 15% employer tax buffer to salaries?',
    answer: 'Base employee salaries do not reflect the true cost of headcount. Employers must pay mandatory state and federal employment taxes (FICA, Medicare, FUTA, SUTA), worker\'s compensation insurance, payroll processing software fees, and basic healthcare benefits. A 15% overhead multiplier (Salary x 1.15) provides an accurate operational forecast.'
  },
  {
    question: 'How do venture capitalists calculate ARR valuation multiples in 2026/2027?',
    answer: 'In modern venture markets, enterprise software valuations are primarily determined as a multiple of Annual Recurring Revenue (ARR). Median private B2B SaaS multiples range between 6x and 9x ARR. However, companies exceeding the Rule of 40 with net dollar retention over 120% command premium multiples of 12x to 20x ARR.'
  }
];

export function generateFAQSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FOUNDER_FAQS.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
}
