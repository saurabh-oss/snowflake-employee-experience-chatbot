import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/snowflake-employee-experience-chatbot/',
    component: ComponentCreator('/snowflake-employee-experience-chatbot/', '9ce'),
    routes: [
      {
        path: '/snowflake-employee-experience-chatbot/',
        component: ComponentCreator('/snowflake-employee-experience-chatbot/', '989'),
        routes: [
          {
            path: '/snowflake-employee-experience-chatbot/',
            component: ComponentCreator('/snowflake-employee-experience-chatbot/', '68c'),
            routes: [
              {
                path: '/snowflake-employee-experience-chatbot/architecture',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/architecture', 'c17'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/snowflake-employee-experience-chatbot/comparison',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/comparison', '492'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/snowflake-employee-experience-chatbot/faq',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/faq', 'f5a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/snowflake-employee-experience-chatbot/intro',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/intro', '1c7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/snowflake-employee-experience-chatbot/quick-start',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/quick-start', '900'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/snowflake-employee-experience-chatbot/security-governance',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/security-governance', 'b4f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/snowflake-employee-experience-chatbot/use-cases',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/use-cases', '837'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/snowflake-employee-experience-chatbot/why-this-project',
                component: ComponentCreator('/snowflake-employee-experience-chatbot/why-this-project', '187'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
