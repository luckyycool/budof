/**
 * 20+ Real-World Startup Tycoon Events & Strategic Dilemmas
 */

export const STARTUP_EVENTS = [
  {
    id: 'hn_viral_launch',
    title: 'Top Spot on Hacker News & Product Hunt!',
    badge: 'Viral Traction',
    badgeColor: 'emerald',
    description: 'Your open-source benchmark post hit #1 on Hacker News and went viral on X (Twitter). Servers are groaning under 50,000 visitors.',
    condition: (state) => state.month >= 2 && state.productQuality >= 50,
    choices: [
      {
        label: 'Auto-Scale Cloud Infrastructure immediately ($2,500 cost)',
        description: 'Absorb the surge gracefully and capture paying enterprise signups.',
        apply: (state) => {
          const newMRR = Math.round(state.mrr * 0.35 + 1800);
          const newCustomers = 120;
          return {
            deltas: { cash: -2500, mrr: newMRR, customers: newCustomers, productQuality: +5 },
            message: `Cloud auto-scaled successfully! Converted 120 new paying customers (+$${newMRR} MRR).`
          };
        }
      },
      {
        label: 'Stay on free/cheaper tier, let some traffic 504 error ($0 cost)',
        description: 'Save cash reserves and capture whatever signups trickle through.',
        apply: (state) => {
          const newMRR = 600;
          return {
            deltas: { cash: 0, mrr: newMRR, customers: 35, productQuality: -8 },
            message: `Free servers crashed intermittently. Captured 35 customers (+$${newMRR} MRR), but user sentiment took a hit.`
          };
        }
      }
    ]
  },
  {
    id: 'cloud_outage_sla',
    title: 'Major Cloud Provider Outage (6 Hours Down)',
    badge: 'Critical Incident',
    badgeColor: 'crimson',
    description: 'Your main database region suffered a rare catastrophic network partition. High-tier clients are furious.',
    condition: (state) => state.month >= 4 && state.customers >= 30,
    choices: [
      {
        label: 'Issue 50% invoice credits & publish transparent post-mortem',
        description: 'Spend cash to protect trust and retain clients long-term.',
        apply: (state) => {
          const refundCost = Math.round(state.mrr * 0.4);
          return {
            deltas: { cash: -refundCost, mrr: 0, customers: 0, productQuality: +4 },
            message: `Customers praised your world-class transparency! 0 clients churned; refunded $${refundCost}.`
          };
        }
      },
      {
        label: 'Blame the cloud vendor in an email blast and issue no refunds',
        description: 'Preserve cash reserve at the risk of customer churn.',
        apply: (state) => {
          const churnCustomers = Math.max(3, Math.round(state.customers * 0.12));
          const lostMRR = Math.round(state.mrr * 0.12);
          return {
            deltas: { cash: 0, mrr: -lostMRR, customers: -churnCustomers, productQuality: -10 },
            message: `${churnCustomers} angry customers cancelled their subscriptions (-$${lostMRR} MRR).`
          };
        }
      }
    ]
  },
  {
    id: 'fortune500_pilot',
    title: 'Fortune 500 Enterprise Pilot Inbound',
    badge: 'Enterprise Sales',
    badgeColor: 'emerald',
    description: 'A global logistics conglomerate wants an annual pilot with custom Single Sign-On (SAML/Okta) and dedicated audit logs.',
    condition: (state) => state.month >= 5 && state.mrr >= 4000,
    choices: [
      {
        label: 'Commit engineering sprint to build SAML SSO ($5k dev cost)',
        description: 'Lock in a lucrative enterprise annual deal ($36,000 upfront ARR).',
        apply: (state) => {
          return {
            deltas: { cash: +31000, mrr: +3000, customers: +1, productQuality: +8 },
            message: `Contract signed! Pocketed $36k upfront cash ($31k net after dev costs) +$3,000 MRR!`
          };
        }
      },
      {
        label: 'Politely decline; stay focused on self-serve SMBs ($0 cost)',
        description: 'Avoid enterprise customization distractions and keep product simple.',
        apply: (state) => {
          return {
            deltas: { cash: 0, mrr: +400, customers: +10, productQuality: +3 },
            message: 'Maintained pure self-serve focus. Picked up 10 standard SMB accounts.'
          };
        }
      }
    ]
  },
  {
    id: 'poach_engineer',
    title: 'Lead Architect Headhunted by Big Tech',
    badge: 'Talent Retention',
    badgeColor: 'amber',
    description: 'Google Cloud recruiters offered your lead architect a $350k total compensation package. They gave you 48 hours to counter.',
    condition: (state) => state.team.engineers >= 1,
    choices: [
      {
        label: 'Counter with a $2,000/mo salary raise + 1.5% equity grant',
        description: 'Retain crucial architecture knowledge and keep product velocity high.',
        apply: (state) => {
          return {
            deltas: { cash: -2000, mrr: 0, customers: 0, productQuality: +10 },
            message: 'Lead architect accepted the counter! Team morale and velocity surged.'
          };
        }
      },
      {
        label: 'Wish them the best and let them depart',
        description: 'Save cash burn, but lose engineering velocity for 2-3 months.',
        apply: (state) => {
          return {
            deltas: { cash: 0, mrr: 0, customers: 0, productQuality: -15 },
            message: 'Lead architect departed. Code velocity slowed down significantly until replaced.'
          };
        }
      }
    ]
  },
  {
    id: 'vc_safe_offer',
    title: 'Prominent VC Offers $250k Angel SAFE',
    badge: 'Capital Infusion',
    badgeColor: 'emerald',
    description: 'A top Silicon Valley angel syndicate is impressed by your growth and offers a $250,000 post-money SAFE at a $4M valuation cap.',
    condition: (state) => state.month >= 6 && state.mrr >= 5000 && state.cash < 80000,
    choices: [
      {
        label: 'Accept the $250k investment (Dilute ~6% equity)',
        description: 'Inject massive cash runway to supercharge hiring and marketing.',
        apply: (state) => {
          return {
            deltas: { cash: +250000, mrr: 0, customers: 0, productQuality: +5 },
            message: '$250,000 wired to your business account! Runway extended by 18+ months.'
          };
        }
      },
      {
        label: 'Reject the offer; stay 100% bootstrapped & independent',
        description: 'Retain 100% equity ownership and control your own destiny.',
        apply: (state) => {
          return {
            deltas: { cash: 0, mrr: +500, customers: 0, productQuality: +2 },
            message: 'Kept 100% founder equity. Bootstrapped discipline pushes you harder toward profitability.'
          };
        }
      }
    ]
  },
  {
    id: 'price_increase_test',
    title: 'Pricing Strategy: Bold 30% Price Increase',
    badge: 'Pricing Elasticity',
    badgeColor: 'slate',
    description: 'Customer feedback indicates your software delivers 10x the value of what you charge. Your advisor suggests raising prices on new signups.',
    condition: (state) => state.month >= 7 && state.productQuality >= 65,
    choices: [
      {
        label: 'Grandfather existing users, raise new plans by 30%',
        description: 'Standard SaaS playbook: maximize ARPU without angering early advocates.',
        apply: (state) => {
          const mrrBoost = Math.round(state.mrr * 0.22);
          return {
            deltas: { cash: 0, mrr: +mrrBoost, customers: +15, productQuality: +2 },
            message: `Price increase succeeded! Higher willingness to pay boosted MRR by +$${mrrBoost}.`
          };
        }
      },
      {
        label: 'Keep prices low to maximize market share & volume',
        description: 'Prioritize rapid user acquisition over short-term revenue.',
        apply: (state) => {
          return {
            deltas: { cash: 0, mrr: +750, customers: +45, productQuality: 0 },
            message: 'Maintained aggressive discount pricing. Influx of 45 budget-conscious users.'
          };
        }
      }
    ]
  },
  {
    id: 'security_vulnerability',
    title: 'Responsible Security Disclosure Received',
    badge: 'Security Alert',
    badgeColor: 'amber',
    description: 'An ethical security researcher submitted a private report showing an IDOR flaw in your API export endpoint.',
    condition: (state) => state.month >= 3,
    choices: [
      {
        label: 'Pay $1,500 bug bounty & deploy fix in 12 hours',
        description: 'Reward the researcher and ensure bulletproof security compliance.',
        apply: (state) => {
          return {
            deltas: { cash: -1500, mrr: 0, customers: 0, productQuality: +8 },
            message: 'Researcher publicly thanked your rapid patch response. Security posture strengthened.'
          };
        }
      },
      {
        label: 'Silently patch the bug without paying a bounty',
        description: 'Save cash, but risk disgruntled researcher leaking the flaw.',
        apply: (state) => {
          const leakRisk = Math.random() < 0.4;
          if (leakRisk) {
            const churnMRR = Math.round(state.mrr * 0.1);
            return {
              deltas: { cash: 0, mrr: -churnMRR, customers: -8, productQuality: -12 },
              message: 'Researcher leaked details on Mastodon! Lost 8 security-conscious customers (-$' + churnMRR + ' MRR).'
            };
          }
          return {
            deltas: { cash: 0, mrr: 0, customers: 0, productQuality: +2 },
            message: 'Patched quietly. Researcher grumbled but moved on. Saved $1,500.'
          };
        }
      }
    ]
  },
  {
    id: 'influencer_endorsement',
    title: 'Top Industry Creator Reviews Your Product',
    badge: 'Organic Viral Surge',
    badgeColor: 'emerald',
    description: 'A respected SaaS educator with 250,000 YouTube subscribers made an unpaid, glowing review of your workflow.',
    condition: (state) => state.month >= 6 && state.productQuality >= 70,
    choices: [
      {
        label: 'Sponsor their next video with a dedicated promo code ($3,000)',
        description: 'Double down on the hot lead source while attention is peaked.',
        apply: (state) => {
          const mrrGain = 2400;
          return {
            deltas: { cash: -3000, mrr: +mrrGain, customers: +70, productQuality: +3 },
            message: `Sponsored video drove 70 high-converting signups! (+$${mrrGain} MRR).`
          };
        }
      },
      {
        label: 'Simply tweet a thank-you note and ride the organic wave ($0)',
        description: 'Capitalize on pure free publicity without spending cash.',
        apply: (state) => {
          const mrrGain = 1100;
          return {
            deltas: { cash: 0, mrr: +mrrGain, customers: +35, productQuality: +2 },
            message: `Organic surge brought in 35 new accounts (+$${mrrGain} MRR) for $0 marketing spend.`
          };
        }
      }
    ]
  },
  {
    id: 'ai_copilot_feature',
    title: 'R&D Breakthrough: Autonomous Workflow Assistant',
    badge: 'Product Innovation',
    badgeColor: 'emerald',
    description: 'Your team built an in-browser AI helper that saves users 3 hours every week. Beta testers are obsessed.',
    condition: (state) => state.team.engineers >= 2 && state.productQuality >= 70,
    choices: [
      {
        label: 'Launch as an exclusive Add-On ($20/mo per seat)',
        description: 'Create an entirely new recurring revenue stream from current users.',
        apply: (state) => {
          const boost = Math.round(state.mrr * 0.28);
          return {
            deltas: { cash: 0, mrr: +boost, customers: 0, productQuality: +12 },
            message: `40% of existing accounts activated the AI add-on! Added +$${boost} MRR instantly!`
          };
        }
      },
      {
        label: 'Bundle free into standard tier to crush competitors',
        description: 'Increase competitive moat and reduce customer churn.',
        apply: (state) => {
          return {
            deltas: { cash: 0, mrr: +800, customers: +30, productQuality: +20 },
            message: 'Users called it the most generous software upgrade ever. Churn fell by 40%!'
          };
        }
      }
    ]
  },
  {
    id: 'remote_first_transition',
    title: 'Office Lease Expiring: Go 100% Remote?',
    badge: 'Operational Efficiency',
    badgeColor: 'slate',
    description: 'Your shared office lease is up for renewal ($3,500/mo). The entire team prefers working remotely.',
    condition: (state) => state.month >= 4,
    choices: [
      {
        label: 'Shut down office; give everyone a $500/mo home stipend',
        description: 'Net savings of $2,000/mo in cash burn while boosting team happiness.',
        apply: (state) => {
          return {
            deltas: { cash: +2000, mrr: 0, customers: 0, productQuality: +4 },
            message: 'Transitioned to remote-first! Saved $2,000/mo in overhead and unlocked global hiring.'
          };
        }
      },
      {
        label: 'Renew office downtown to preserve in-person culture',
        description: 'Maintain whiteboarding synergy at the cost of high recurring burn.',
        apply: (state) => {
          return {
            deltas: { cash: -1500, mrr: 0, customers: 0, productQuality: +2 },
            message: 'Office renewed. High recurring rent continues to weigh on monthly cash balance.'
          };
        }
      }
    ]
  }
];
