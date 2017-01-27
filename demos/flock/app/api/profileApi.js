import 'whatwg-fetch';

import urls from '../urls';


class ProfileApi {

    static getAllProfiles() {
        return new Promise((resolve, reject) => {
            fetch(urls.profile.getAll).then(function(response) {
                return response.json();
            }).then(function(profiles) {
                resolve(Object.assign([], profiles));
            }).catch(function(error) {
                reject(error);
            });
        });
    }

}
export default ProfileApi;
