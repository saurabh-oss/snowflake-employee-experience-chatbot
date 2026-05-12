/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '🏠 Home',
    },
    {
      type: 'category',
      label: '📖 Overview',
      items: [
        {
          type: 'doc',
          id: 'why-this-project',
          label: 'Why This Project?',
        },
        {
          type: 'doc',
          id: 'use-cases',
          label: 'Use Cases',
        },
        {
          type: 'doc',
          id: 'comparison',
          label: 'Why Cortex?',
        },
      ],
    },
    {
      type: 'category',
      label: '🔧 Technical',
      items: [
        {
          type: 'doc',
          id: 'architecture',
          label: 'Architecture',
        },
        {
          type: 'doc',
          id: 'security-governance',
          label: 'Security & Governance',
        },
        {
          type: 'doc',
          id: 'quick-start',
          label: 'Quick Start',
        },
      ],
    },
    {
      type: 'doc',
      id: 'faq',
      label: '❓ FAQ',
    },
  ],
};

module.exports = sidebars;
