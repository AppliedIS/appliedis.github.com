# Ohio Demo Site

This site is used to display demo's of AIS developed software for clients, job fairs, etc. 

## Demos

The Current Demos included are

* Eris
* Scale 5
* Scale 7
* Sigma
* Flock

The Scale 7 Demo uses a mock API which can be found [here](https://scale-7-demo-api.azurewebsites.net/).

## Azure Setup

To make changes to the [existing Azure Demo Site](https://demositestatic.z13.web.core.windows.net/demos) all that is required is a successful pull request to the **scale-7** branch. A Github action will update the site automatically.

To create the site, first a storage account in Azure must be made. After the Storage Account is made, go to Static Website and enable it. A blob named `$web` will be created. At this point there are a couple options.

The first is to use the Azure Storage Explorer and simply dump the repository into the static site blob. Another option is to use Github Actions to upload the reposiory. The benefit of this approach being continuous deployment. [This Page](https://github.com/tibor19/static-website-deploy) to activate it, push to the Github repository. 

