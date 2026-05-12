/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Employee Experience Chatbot',
  tagline: 'Secure, Governed Employee Intelligence on Snowflake Cortex',
  favicon: 'img/favicon.ico',
  url: 'https://saurabh-oss.github.io',
  baseUrl: '/snowflake-employee-experience-chatbot/',
  organizationName: 'saurabh-oss',
  projectName: 'snowflake-employee-experience-chatbot',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,
  onBrokenLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/tree/main/website/',
          routeBasePath: '/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  themeConfig: {
    image: 'img/og-image.png',
    navbar: {
      title: '👥 EX Chatbot',
      logo: {
        alt: 'Snowflake Logo',
        src: 'img/snowflake-icon.svg',
        width: 32,
        height: 32,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/saurabh-oss/snowflake-employee-experience-chatbot',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/ARCHITECTURE.md',
          label: 'Deep Dive',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/quick-start',
            },
            {
              label: 'Architecture',
              to: '/architecture',
            },
            {
              label: 'Security & Governance',
              to: '/security-governance',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/saurabh-oss/snowflake-employee-experience-chatbot',
            },
            {
              label: 'Architecture.md',
              href: 'https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/ARCHITECTURE.md',
            },
            {
              label: 'License (MIT)',
              href: 'https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/LICENSE',
            },
          ],
        },
        {
          title: 'Learn More',
          items: [
            {
              label: 'Snowflake Cortex',
              href: 'https://docs.snowflake.com/en/user-guide/cortex/cortex-overview',
            },
            {
              label: 'Cortex Search',
              href: 'https://docs.snowflake.com/en/user-guide/cortex/cortex-search/cortex-search-overview',
            },
            {
              label: 'Cortex Analyst',
              href: 'https://docs.snowflake.com/en/user-guide/cortex/cortex-analyst/overview',
            },
          ],
        },
      ],
      copyright: `Built with ❤️ on Snowflake Cortex. © ${new Date().getFullYear()} Open Source.`,
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  },
};

module.exports = config;
