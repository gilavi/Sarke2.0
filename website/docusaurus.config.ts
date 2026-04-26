import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Sarke 2.0',
  tagline: 'ხარაჩოს უსაფრთხოების შემოწმების აპი — full project documentation',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://gilavi.github.io',
  baseUrl: '/Sarke2.0/docs/',

  organizationName: 'gilavi',
  projectName: 'Sarke2.0',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/gilavi/Sarke2.0/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Sarke 2.0',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/swagger',
          label: 'Swagger',
          position: 'left',
        },
        {
          href: 'https://github.com/gilavi/Sarke2.0',
          label: 'GitHub',
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
            {label: 'Introduction', to: '/'},
            {label: 'Architecture', to: '/architecture'},
            {label: 'Data model', to: '/data-model'},
          ],
        },
        {
          title: 'Reference',
          items: [
            {label: 'Routes', to: '/routes/auth'},
            {label: 'Components', to: '/components'},
            {label: 'Lib', to: '/lib'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Source on GitHub', href: 'https://github.com/gilavi/Sarke2.0'},
            {label: 'Swagger UI', to: '/swagger'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Sarke. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['sql', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
