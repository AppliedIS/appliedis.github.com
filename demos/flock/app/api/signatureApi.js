import 'whatwg-fetch';

import urls from '../urls';


class SignatureApi {

    static getAllSignaturesForProfile(profileId) {
        return new Promise((resolve, reject) => {
            let url = urls.signature.byProfileId + profileId + '_signatures.json';
            fetch(url).then(function(response) {
                return response.json();
            }).then(function(signatures) {
                resolve(Object.assign([], signatures));
            }).catch(function(error) {
                reject(error);
            });
        });
    }

    static getSignatureById(signatureId) {
        let url = urls.signature.bySignatureId + signatureId + '.json';
        return new Promise((resolve, reject) => {
            fetch(url).then(function(response) {
                return response.json();
            }).then(function(signature) {
                resolve(Object.assign({}, signature));
            }).catch(function(error) {
                reject(error);
            });
        });
    }
    static getAllSignatures() {
        let url = urls.signature.getAll;
        return new Promise((resolve, reject) => {
            fetch(url).then(function(response) {
                return response.json();
            }).then(function(signatures) {
                resolve(Object.assign([], signatures));
            }).catch(function(error) {
                reject(error);
            });
        });
    }

}
export default SignatureApi;
