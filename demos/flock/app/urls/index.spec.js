import expect from 'expect';

import urls from './index';


describe('urls', () => {
    // Make sure index.js gathers all of the sub-urls we need
    it('should contain some urls to /api/profile', () => {
        expect(urls.profile).toExist();
    });
});

describe('urls', () => {
    // Make sure index.js gathers all of the sub-urls we need
    it('should contain some urls to /api/signature', () => {
        expect(urls.signature).toExist();
    });
});
