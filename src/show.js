import { Svue } from 'svue';

export const show = new Svue({
  data() {
    return {
      showAll: false,
      showCounty: false,
      showState: false,
      county: null,
      state: null,

      // Metrics
      showMetrics: false,

      // Settings
      showSettings: false,
    }
  }
});

export function resetShow() {
  show.showAll = false;
  show.showCounty = false;
  show.showState = false;
  show.county = null;
  show.state = null;
}
