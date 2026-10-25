/**
 * 24-Month Startup Tycoon State Machine
 * Real-world turn-based startup operator simulation.
 */

import { STARTUP_EVENTS } from './tycoon-events.js';

export const SALARIES = {
  founder: 2500,
  engineer: 5000,
  marketer: 4000,
  sales: 4500
};

export const ARPU_BASELINE = 50; // $50/mo blended SaaS ARPU

export class TycoonGame {
  constructor(initialConfig = {}) {
    this.reset(initialConfig);
  }

  reset(initialConfig = {}) {
    this.month = 1;
    this.maxMonths = 24;
    this.cash = initialConfig.startingCash ?? 120000;
    this.mrr = initialConfig.startingMRR ?? 3000;
    this.customers = initialConfig.startingCustomers ?? 60;
    this.productQuality = 65; // 0 to 100
    this.status = 'active'; // 'active' | 'bankrupt' | 'default_alive' | 'unicorn' | 'completed'

    this.team = {
      founders: 2,
      engineers: 1,
      marketers: 0,
      sales: 0
    };

    this.budget = {
      marketing: 1000,
      rAndD: 1000,
      ops: 800
    };

    this.history = [];
    this.pendingEvent = null;
    this.usedEventIds = new Set();
    this.equityDilutionPct = 0; // % surrendered to VCs
    this.roundsRaised = [];

    this._recordHistorySnapshot('Started Startup Journey');
  }

  getMonthlyPayroll() {
    // 15% benefits and employment tax factor on hired staff
    const founderPay = this.team.founders * SALARIES.founder;
    const engineerPay = this.team.engineers * SALARIES.engineer * 1.15;
    const marketerPay = this.team.marketers * SALARIES.marketer * 1.15;
    const salesPay = this.team.sales * SALARIES.sales * 1.15;

    return Math.round(founderPay + engineerPay + marketerPay + salesPay);
  }

  getMonthlyOpEx() {
    const payroll = this.getMonthlyPayroll();
    const discretionary = (this.budget.marketing || 0) + (this.budget.rAndD || 0) + (this.budget.ops || 0);
    return Math.round(payroll + discretionary);
  }

  getNetBurn() {
    return Math.round(this.getMonthlyOpEx() - this.mrr);
  }

  hire(role) {
    if (this.status !== 'active') return false;
    if (this.team[role] !== undefined) {
      this.team[role]++;
      return true;
    }
    return false;
  }

  fire(role) {
    if (this.status !== 'active') return false;
    if (role === 'founders' && this.team.founders <= 1) return false; // Minimum 1 founder
    if (this.team[role] && this.team[role] > 0) {
      this.team[role]--;
      return true;
    }
    return false;
  }

  setBudget(category, amount) {
    if (this.budget[category] !== undefined) {
      this.budget[category] = Math.max(0, Math.round(Number(amount) || 0));
    }
  }

  _recordHistorySnapshot(eventNote = '') {
    this.history.push({
      month: this.month,
      cash: Math.round(this.cash),
      mrr: Math.round(this.mrr),
      arr: Math.round(this.mrr * 12),
      customers: this.customers,
      netBurn: this.getNetBurn(),
      productQuality: this.productQuality,
      eventNote
    });
  }

  advanceTurn() {
    if (this.status !== 'active') return false;
    if (this.pendingEvent) {
      // Must resolve pending event first
      return false;
    }

    const netBurn = this.getNetBurn();
    this.cash -= netBurn;

    // 1. Engineering impact on Product Quality
    // Each engineer adds quality; R&D budget boosts velocity; baseline decay from tech debt
    const rdVelocity = (this.budget.rAndD / 1000) * 1.5;
    const engineerQualityGain = (this.team.engineers * 2.2) + rdVelocity - 0.8;
    this.productQuality = Math.max(15, Math.min(100, Math.round(this.productQuality + engineerQualityGain)));

    // 2. Churn Dynamics (Quality dampens churn)
    // Quality 100 -> ~1.5% churn; Quality 50 -> ~4.5% churn; Quality 20 -> ~7.5% churn
    const monthlyChurnRatePct = Math.max(1.2, 8.0 - (this.productQuality * 0.065));
    const churnedCustomers = Math.round(this.customers * (monthlyChurnRatePct / 100));

    // 3. Customer Acquisition
    // Organic leads depend on product quality and brand
    const organicLeads = 15 + Math.round(this.productQuality * 0.4);
    // Paid leads from marketing budget ($35 CAC per lead baseline)
    const paidLeads = Math.round((this.budget.marketing || 0) / 35);
    // Marketer synergy multiplier (+30% leads per growth marketer)
    const marketerMultiplier = 1 + (this.team.marketers * 0.35);
    const totalLeads = Math.round((organicLeads + paidLeads) * marketerMultiplier);

    // Sales Rep conversion boost (base self-serve conversion 5%, each sales rep closes +2.5% of leads into high-tier)
    const conversionRate = 0.05 + (this.team.sales * 0.025);
    const newCustomers = Math.max(1, Math.round(totalLeads * conversionRate));

    // Net Customer Change
    this.customers = Math.max(1, this.customers + newCustomers - churnedCustomers);

    // MRR Progression
    const newMRR = newCustomers * ARPU_BASELINE;
    const lostMRR = churnedCustomers * ARPU_BASELINE;
    this.mrr = Math.max(500, Math.round(this.mrr + newMRR - lostMRR));

    // Check for Bankrupt
    if (this.cash <= 0) {
      this.cash = 0;
      this.status = 'bankrupt';
      this._recordHistorySnapshot('Bankrupt: Cash reserves depleted');
      return { status: this.status, message: 'Game Over: Your company ran out of cash before reaching profitability.' };
    }

    // Check for milestone finish (Month 24)
    if (this.month >= this.maxMonths) {
      if (this.mrr >= 83334) { // $1,000,000 ARR
        this.status = 'unicorn';
        this._recordHistorySnapshot('Winner: Reached $1M ARR ($83.3k MRR)');
        return { status: this.status, message: 'Incredible Victory! You scaled past $1,000,000 ARR in 24 months!' };
      } else if (this.getNetBurn() <= 0) {
        this.status = 'default_alive';
        this._recordHistorySnapshot('Default Alive: Cash-flow positive & self-sustaining');
        return { status: this.status, message: 'Success! You built a self-sustaining, profitable SaaS business!' };
      } else {
        this.status = 'completed';
        this._recordHistorySnapshot('Completed 24-Month Runway');
        return { status: this.status, message: '24-Month Horizon Reached. You survived with positive cash!' };
      }
    }

    this.month++;
    this._recordHistorySnapshot(`Month ${this.month} Operations`);

    // Check for random event triggering (roughly every 2-3 months)
    this._triggerEligibleEvent();

    return {
      status: this.status,
      newCustomers,
      churnedCustomers,
      netBurn,
      pendingEvent: this.pendingEvent
    };
  }

  _triggerEligibleEvent() {
    // Only trigger if no pending event and random chance (~45% per turn)
    if (this.pendingEvent) return;
    if (Math.random() > 0.45 && this.month % 3 !== 0) return;

    const availableEvents = STARTUP_EVENTS.filter(e => {
      if (this.usedEventIds.has(e.id)) return false;
      if (typeof e.condition === 'function') {
        try {
          return e.condition(this);
        } catch {
          return false;
        }
      }
      return true;
    });

    if (availableEvents.length > 0) {
      const selected = availableEvents[Math.floor(Math.random() * availableEvents.length)];
      this.pendingEvent = selected;
      this.usedEventIds.add(selected.id);
    }
  }

  resolveEvent(choiceIndex) {
    if (!this.pendingEvent) return null;
    const choice = this.pendingEvent.choices[choiceIndex];
    if (!choice) return null;

    const result = choice.apply(this);
    if (result && result.deltas) {
      if (result.deltas.cash) this.cash += result.deltas.cash;
      if (result.deltas.mrr) this.mrr = Math.max(500, this.mrr + result.deltas.mrr);
      if (result.deltas.customers) this.customers = Math.max(1, this.customers + result.deltas.customers);
      if (result.deltas.productQuality) {
        this.productQuality = Math.max(10, Math.min(100, this.productQuality + result.deltas.productQuality));
      }
    }

    const eventTitle = this.pendingEvent.title;
    this.pendingEvent = null;

    // Check if event caused cash to dip <= 0
    if (this.cash <= 0) {
      this.cash = 0;
      this.status = 'bankrupt';
    }

    this._recordHistorySnapshot(`Event Resolved: ${eventTitle}`);
    return result;
  }

  pitchInvestors(roundType) {
    if (this.status !== 'active') {
      return { success: false, message: 'Cannot pitch investors in current game state.' };
    }

    const currentARR = this.mrr * 12;

    if (roundType === 'angel') {
      if (this.roundsRaised.includes('angel')) {
        return { success: false, message: 'Angel SAFE already raised in this journey.' };
      }
      // Angel criteria: Product Quality >= 55, MRR >= $3k
      if (this.mrr >= 3000 && this.productQuality >= 55) {
        this.cash += 150000;
        this.equityDilutionPct += 8;
        this.roundsRaised.push('angel');
        this._recordHistorySnapshot('Closed $150k Angel Round');
        return { success: true, message: 'Angel Syndicate signed! Wired $150,000 for 8% equity.', cashAdded: 150000 };
      } else {
        return { success: false, message: 'Angels passed: "Build more product traction and reach at least $3k MRR first."' };
      }
    }

    if (roundType === 'seed') {
      if (this.roundsRaised.includes('seed')) {
        return { success: false, message: 'Seed Round already completed.' };
      }
      // Seed criteria: MRR >= $15k, Quality >= 65
      if (this.mrr >= 15000 && this.productQuality >= 65) {
        this.cash += 600000;
        this.equityDilutionPct += 15;
        this.roundsRaised.push('seed');
        this._recordHistorySnapshot('Closed $600k Seed Round');
        return { success: true, message: 'Seed VC Term Sheet accepted! Added $600,000 cash for 15% equity.', cashAdded: 600000 };
      } else {
        return { success: false, message: 'Seed VCs passed: "Impressive progress, but we need to see $15k+ MRR and proven unit economics."' };
      }
    }

    if (roundType === 'seriesA') {
      if (this.roundsRaised.includes('seriesA')) {
        return { success: false, message: 'Series A already completed.' };
      }
      // Series A criteria: MRR >= $50k ($600k ARR), Quality >= 75
      if (this.mrr >= 50000 && this.productQuality >= 75) {
        this.cash += 2500000;
        this.equityDilutionPct += 20;
        this.roundsRaised.push('seriesA');
        this._recordHistorySnapshot('Closed $2.5M Series A Round');
        return { success: true, message: 'Tier-1 Silicon Valley VC led $2.5M Series A! Surrendered 20% equity.', cashAdded: 2500000 };
      } else {
        return { success: false, message: 'Series A Partners passed: "Need $600k+ ARR ($50k MRR) with top-quartile retention metrics to lead Series A."' };
      }
    }

    return { success: false, message: 'Unknown investment round selected.' };
  }
}
