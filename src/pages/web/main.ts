import { defineComponents } from '@src/pages/web/modules';

defineComponents({ patch: true })
  .then(() => console.info('Web components defined.'))
  .catch(err => console.error('Web components failed to define.', err));

if (module.hot) module.hot.accept();
