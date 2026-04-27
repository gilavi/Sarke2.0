import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'whats-new',
    'getting-started',
    'architecture',
    {
      type: 'category',
      label: 'Routes',
      collapsed: false,
      items: [
        'routes/auth',
        'routes/tabs',
        'routes/inspections',
        'routes/projects',
        'routes/certificates',
        'routes/qualifications',
        'routes/misc',
      ],
    },
    'components',
    'lib',
    'data-model',
    {
      type: 'category',
      label: 'Database',
      collapsed: false,
      items: ['database/schema', 'database/migrations', 'database/api'],
    },
    'pdf-generation',
    'offline-sync',
    'signing-flow',
    'deployment',
    'contributing',
  ],
};

export default sidebars;
