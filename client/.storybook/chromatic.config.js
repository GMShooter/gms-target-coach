module.exports = {
  // Storybook configuration for Chromatic
  storybookConfigDir: '.storybook',
  // Build Storybook before running tests
  buildScriptName: 'build-storybook',
  // Exit with an error code if visual tests fail
  exitZeroOnChanges: false,
  // Only run tests on pull requests
  onlyStorybook: false,
  // Enable auto-accept changes for the first run
  autoAcceptChanges: false,
  // Skip stories with these tags
  skip: ['skip-chromatic'],
  // Custom CSS to inject during visual testing
  css: `
    /* Disable animations during visual testing */
    * {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `,
};