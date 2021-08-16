# Product Marketplace MVP

Backbone for a marketplace-like project to be deployed on [platformOS.com](http://platformos.com)



# Demo

You can preview the marketplace template on our demo site here:

[https://getmarketplace.co](https://getmarketplace.co)



# Status

**Still in active development** and some concepts are being validated and might change.



# Table of contents
- [Product Marketplace MVP](#product-marketplace-mvp)
- [Demo](#demo)
- [Status](#status)
- [Table of contents](#table-of-contents)
- [Installation](#installation)
  - [Seed sample data](#seed-sample-data)
- [Setup](#setup)
- [Development guidelines](#development-guidelines)
  - [Getting to know platformOS](#getting-to-know-platformos)
  - [First changes](#first-changes)
  - [General rules](#general-rules)
  - [Commands / business logic](#commands--business-logic)
  - [Data queries](#data-queries)
  - [Presentation views - HTML / JSON](#presentation-views---html--json)
  - [Design guidelines](#design-guidelines)
    - [How to use](#how-to-use)
    - [When to add](#when-to-add)
  - [Front-end code rules and best practices](#front-end-code-rules-and-best-practices)
    - [Setup your environment right](#setup-your-environment-right)
    - [Before you start to code](#before-you-start-to-code)
    - [General recommendations](#general-recommendations)
    - [HTML](#html)
    - [SEO](#seo)
    - [CSS](#css)
    - [JavaScript](#javascript)
    - [Security](#security)
    - [Peer review](#peer-review)
  - [Front-end API](#front-end-api)
  - [Events](#events)
    - [General](#general)
    - [Consumers](#consumers)
  - [Custom validation error messages](#custom-validation-error-messages)
  - [Social Media / Community](#social-media--community)
    - [groups](#groups)
    - [following](#following)
    - [activity feeds](#activity-feeds)
    - [activities](#activities)
  - [Categories](#categories)
  - [Spam protection](#spamprotection)
  - [Generators](#generators)
    - [CRUD](#crud)
    - [REST API](#rest-api)
    - [For automation / CI/CD purposes:](#for-automation--cicd-purposes)
  - [Tests](#tests)
    - [E2E Tests](#e2e-tests)
    - [E2E Test Report](#e2e-test-report)
    - [Unit Tests](#unit-tests)
  - [Continuous Integration with GitHub actions](#continuous-integration-with-github-actions)
    - [How this workflow works?](#how-this-workflow-works)
    - [Set workflow](#set-workflow)
  - [Updating your related app](#updating-your-related-app)
  - [Stripe integration](#stripe-integration)



# Installation

This is a cheat sheet for installing the Product Marketplace Template. For complete installation instructions visit [Get Started: pOS Marketplace Template](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template).

1. [Install the pos-cli](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template#step-1-install-the-pos-cli)

```sh
npm install -g @platformos/pos-cli
```

2. [Create Instance](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template#step-2-create-instance)

Go to https://partners.platformos.com/instances/new

3. [Add Instance to pos-cli](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template#step-3-add-instance-to-pos-cli)

``` sh
mkdir marketplace
cd marketplace
pos-cli env add <YOUR_ENV_NAME> --email <YOUR_EMAIL> --url <YOUR_INSTANCE_URL>
```

4. [Clone the repository](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template#step-4-clone-the-repository)

``` sh
pos-cli init --url https://github.com/Platform-OS/product-marketplace-template.git
```

5. [Build assets](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template#step-5-build-assets)

```sh
npm install
npm run build
```

6. [Deploy](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template#step-6-deploy)

```sh
pos-cli deploy <YOUR_ENV_NAME>
```

Open your web browser with your Instance URL where you will be provided with post-install steps.


## Seed sample data

``` sh
pos-cli data import <YOUR_ENV_NAME> --path=seed/data.zip --zip
pos-cli uploads push <YOUR_ENV_NAME> --path=seed/images.zip
```

There is also script `seed/seed.sh` that will clear instance and seed data

``` sh
sh seed/seed.sh <YOUR_ENV_NAME>
```



# Setup

- To access the admin panel of your marketplace register a user with this email address: `admin@example.com`
- Enter the `Admin` section from main menu and go to the `Marketplace Setup` section.
- Admins are identified based on email addresses defined in the Constant `superadmins` - see `app/migrations/20200811133711_set_superadmins.liquid`

See our [Get Started documentation for Setting Up Stripe Connect](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template#step-7-set-up-your-marketplace).




# Development guidelines

## Getting to know platformOS

- We assume you have basic understanding of platformOS
- Otherwise we recommend starting with our [Get Started: pOS Marketplace Template](https://documentation.platformos.com/get-started/marketplace-template/marketplace-template) tutorial


## First changes

1. Run sync `pos-cli sync <YOUR_ENV_NAME>`
2. Edit your marketplace name in file `app/translations/en.yml`, key: `en.app.title`
3. See changes on your website


## General rules

Template is meant to be easily configurable. In order to achieve it, there are some rules you need to follow:

- Never hardcode any static text, always use translations - to easily allow other language versions)
- Display date/time using `l` filters, which rely on translations - to easily change formats for example from dd.mm.yyyy to mm/dd/yyyy)
- No assumptions about currency / price calculations - never multiple / divide by 100 for example to convert dollars to cents etc - there are currencies with different conversion rates. Always use amount_to_fractional / fractional_to_amount filters

Business logic and presentation logic are separated and should not interfere with each other, meaning:

- no HTML tags in business logic
- no data queries in presentation layer

## Commands / business logic

Command is our concept to encapsulate business rules. By following our recommendation, you will improve the consistency of your code, so it will be easy to onboard new developers to the project and easier to take over existing projects. We are using the same pattern for all of our templates. The advantage of using this architecture is that it will be easy to re-use the command - you will be able to execute it both in a live web request, as well as a background job. It will also be easy to copy it across different projects.

![CommandWorkFlow](https://trello-attachments.s3.amazonaws.com/5f2abc6a5aa3bc157e8cee0c/871x721/4b5846b5d0080662351977819dfcc02f/pos-command%282%29.png)

- location: /app/views/partials/lib/commands
- for business logic use commands
- general command consists of 3 stages:
  - build - This is the place where you build input for the command; if you are proficient with platformOS - equivalent of `Form`'s `default_payload`)
  - validate - This is the place where you validate the input - for example, you ensure all required fields are provided, you check uniqueness, check the format of the input (numbers are really a numbers and not letters) etc. This always returns hash with two keys - `valid` being either `true` or `false`, and if `false` - `errors` with details why validation has failed.
  - execute - If validation succeeds, proceed with executing the command. Any error raised here should be considered 500 server error. If you allow errors here, it means there is something wrong with the code organisation, as all checks to prevent errors should be done in `validate` step.

- commands are designed to be easily executed as background job [heavy commands - external API call, expensive operations computations, reports]
- each command might produce an event


## Data queries

- location: `app/views/partials/lib/queries`
- generally these are wrappers on graphql queries


## Presentation views - HTML / JSON

To ensure frontend is maintainable and easy to change, we follow couple of important rules. First of all, all our frontend code is inside `theme` directory. Those file should not know about existence of any other file outside of theme. All data that are needed for the frontend should be explicitly provided to them - there shouldn't be any GraphQL queries inside theme. If you need extra data that are not provided by default, we suggest to make all GraphQL queries inside a page (which you can treat as a Controller in MVC architecture) and explicitly provide the result of this query to the partial.

- location: app/views/partials/theme
- partials to be aware ONLY of local variables - no context.session OR context.exports are allowed
- prepare / fetch external data in a page and pass it to partials as local variable
- also no graphql queries are allowed within theme folder


## Design guidelines

The [Design Style Guide](https://getmarketplace.co/style-guide) is a single place to see all visual styles such as headers, links, buttons, colors, fonts, and other common user interface elements of the application. Since the Marketplace Template is a foundation for building various applications, it is a **perfect place to start** designing and customizing it your own way.

- It allows you to build a theme and customize the site much faster.
- It helps you build new pages easier thanks to the list of available interface elements.
- Design consistency is easier to maintain.
- Designers, developers, and content owners can use it as a single point of reference.
- New members to the team will have an easier start with all available elements documented.
- It allows you to standarize both code and design across the whole site.

When using the Template you can find the guidelines via the `/style-guide` URL.

### How to use

Each interface element has an example of how it looks and works and also an example of code (or a class name) next to it that allows you to copy & paste to use.

- Start by customizing the colors in `tailwind.config.js`. For reference of other customization options, please refer to the [official Tailwind CSS documentation](https://tailwindcss.com/docs).
- Customize the typography and basic web elements in `body.css` or in a corresponding CSS component file in `src/components/`.
- Customize the shared user interface elements by editing their template partials in `theme/simple/ui`.

### When to add

Each interface element used more than once on the site should be extracted to a separate component. For the guideline to fulfill its role, it needs to be adequately maintained.

There are three places where you can add and edit the interface elements:
- The colors, shadows, font stacks, and spacings can be edited and added to `tailwind.config.js`.
- The basic interface elements like headings, buttons, and links are styled in `src/css` folder. The CSS should be used **only for components that don't rely on the HTML structure** to work.
- More advanced components that are depending on their HTML structure should be extracted to a *template partial* and are stored in `theme/simple/ui`. Template partials use the [Liquid](https://documentation.platformos.com/api-reference/liquid/introduction) templating language.

When adding an element to the guidelines, make sure that you do not duplicate anything that is already there. *Do you really need a 6th version of the button?* Each added element should:
- have a working example;
- have some simple documentation on how to use it in the form of a code sample or class name;
- be placed correctly in a corresponding section for easier navigation through the document.

### Error pages

- 404 and 500 pages are using drawings from https://undraw.co/search


## Front-end code rules and best practices

### Setup your environment right
We are including `.editorconfig` file that will tell your code editor what coding style to apply. Use a plugin that will handle the file, for example [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig). This will make your code consistent with the team standards.

### Before you start to code
1. Make sure you understand the task you are working on and have every information needed to handle it.
2. Think through if the change you are working on will benefit the base [Template](https://github.com/Platform-OS/product-marketplace-template) or should you include it just in the related project.
3. Each change should be made in a separate [branch](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging), so create one for your code.
4. Choose a short but meaningful name for the branch (`homepage-slider` instead of `new-code`).

### General recommendations
- Do not leave any unnecessary commented code. If you think something should be done later, create a task instead of commenting it in code.
- Make sure the part of the website you are working on is behaving nicely on smaller and larger screen resolutions.
- Make sure the part of the website you are working on is looking good when you zoom in in the browser to 200%.
- Optimize all images you are adding to a project, resize them if you don't need a high resolution version
  - For PNGs you can use [TinyPNG](https://tinypng.com)
  - For SVGs use [SVGOMG](https://jakearchibald.github.io/svgomg/)
  - You can also use [ImageOptim](https://imageoptim.com/) or [Squoosh](https://squoosh.app) for any image type
  - Use `picture` tag instead of `img` to provide the most appropriate size for given viewport.
  - Set `width` and `height` attributes for your images so the page can be rendered faster.
- When doing bigger changes check your page using [Google Lighthouse](https://developers.google.com/web/tools/lighthouse) and check for the improvements it recommends.
- When doing a change in any of the existing elements, make sure that you update the corresponding [tests](#tests).
  - When working on a new feature, build new tests for it.
- Please use meaningful commits messages to describe what exactly was done.

### HTML
- Use [semantic tags](https://www.internetingishard.com/html-and-css/semantic-html/) as much as possible
- Try not to use too many HTML elements, the simpler the code, the better.
- All non-text content elements should have an accessible labels
  - Images should have `alt` attributes, clickable icons should have titles etc.
- If you are repeating a part of a code a lot, consider creating a partial or adding it to the Style Guide.
- Use the appropriate HTML5 input types for given form field.
- Remember you can validate the forms easily using the [`pattern`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern), `required` and related attributes.
- Do not hardcode any strings, use the translations instead.
- Use icons from Streamline pack ( https://app.streamlinehq.com/streamline-light/interface-essential - ask for access to https://drive.google.com/drive/u/1/folders/16NZhxB2sImtQ3LpqUi_fzI2crz0Wlj50 )

### SEO
If you are working on a new Page, think about whether it should be easily shareable across social media (for example product details page, user profile page). If yes, then:

- Ensure friendly URLs (for example /products/my-product-name instead of /products/1);
- Ensure OpenGraph tags are set.

### CSS
- The project uses [Tailwind CSS](https://tailwindcss.com) so we are using so-called [utility classes](https://tailwindcss.com/docs/utility-first) and trying to avoid writing our own CSS if possible.
- There are some exceptions from the above, additional reusable classes were created for the most commonly used building blocks, you can find the list of those under `/style-guide` URL of your project. Avoid duplicating those and use them whenever possible to keep the design consistency.
- To modify colors, spacings, shadow styles etc. please use `tailwind.config.js` file, not the CSS.
- If creating additional CSS make sure to place it in a separate file and `@import`ing it in `components.css`.
- The Template supports multiple languages, so we need to consider left-to-right reading direction. We are ensuring this by not using directional CSS properties like `margin-left`. Instead we are using `margin-inline-start` - so called [logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties). To achieve this with Tailwind we rely on [tailwindcss-rtl](https://github.com/20lives/tailwindcss-rtl) plugin.

### JavaScript
- Avoid loading heavy third-party libraries if they can be replaced by a simpler self-made solution.
- Create a separate file for the module you are working on and then load it in `app.js` using one of those methods:
  - `import './js/module';` for small files that are used across the site (less than 5 kb)
  - `import('./js/search');` for files that are used across the site to load them asynchronously (more than 5 kb)
  - ```
    if ($q('code[class*="language-"]')) {
      import('./js/syntaxHighlighting');
    }
    ```

    for large files and code that is being used only on certain situations depending on the page you are on
- Use meaningful function/class names and if needed describe what they are doing and what arguments they take in comments.
- Remember to cache your DOM requests for additional speed.

### Security
- Never use `html_safe` or equivalent on the input which comes from the user (potential XSS attack).
- If you create a new page, make sure you start with authentication (if the user needs to be logged in at all to view it) and authorization rules (Should the currently logged in user have permission to access this Page).
- Do not rely solely on frontend validation, always make sure there's backend validation as well.

### Peer review
- When finished working on your code, create a pull request for it.
- Do a self-review first. Read the changes you've made and try to get into the reviewers boots. What is not clear, what could be improved.
- Make sure the tests are all green.
- Make sure there are no JavaScript errors.
- Place a link to your task card in the PR description so the reviewer can understand what was your task.
- Some reviewers are checking the PRs from time to time, but you might want to bring attention to your PR by asking for review in appropriate Slack channel.
- When you are done with the changes after a code review, write a comment to notify the reviewer that the code is ready for another look.
- Sometimes you might not agree with the reviewer. If so - reply to a comment and discuss why.




## Front-End API
The api methods and data is available in gloabal `api` variable. For further reference please see details below.

### Profile data
The currently logged in profile data is stored in `api.profile`.

### Translation strings
Translation strings for current page are defined in `api.strings` and usually set on top of page's template:
```js
<script>
  api.strings = {
    cantAddToWishlist: "{{ 'app.errors.cant_add' | t }}",
    quantityExceeded: "{{ 'app.orders.line-items.errors.quantity-too-big' | t }}",
    saving: "{{ 'app.wishlists.saving' | t }}",
    addedToWishlist: "{{ 'app.success.added' | t }}"
  };
</script>
```

### Flash messages/notifications
Shows the flash/notification message of given type and content.

```js
let myNotification = new api.flash('[type]', '[content]', [settings]);
```

**Arguments**
| Name | Description |
| --- | --- |
| `type` | **String**. The type of the notification to show, choosen from: `error`, `success` |
| `content` | **String**. The message that will appear on the notification. |
| `settigns` | **Object**. The settings that will overwrite defaults. |

**Methods**
| Name | Description |
| --- | --- |
| `show()` | Shows the notification. Ran by default when creating the object. |
| `hide()` | Hides the notification imidiately. |

**Settings**
An object that will pass optional user settings to overwrite the defaults. `{setting: value}`
| Name | Description |
| --- | --- |
| `autohide` | **Bool**. If you want the notification to be hidden automatically after some time. Defaults to `true` for success messages and `false` for errors. |
| `delay` | **Int**. The amount of miliseconds that the notification will wait before appearing on screen. |



### Toggle all checkboxes in given container
Checkes or unchecks all checkboxes in given container. __Available only in admin panel.__

```js
api.toggleList([container], [settings])
```

**Arguments**
| Name | Description |
| --- | --- |
| `container` | **DOM node**. The element that holds the checkboxes that will be toggled |

**Returns**
| Name | Condition |
| --- | --- |
| `true` | If all the boxes were checked |
| `false` | If all the boxes were unchecked |



## Events

### General
- each command produces an event
- example: when users logs in the system produces `user_session_created` event ` { actor: { id: LOGGED_USER_ID } }`
- then the event can be asynchronously consumed by a consumer

### Consumers
- location: `app/views/partials/lib/consumers`



## Custom validation error messages

See [commit/c4c046](https://github.com/mdyd-dev/product-marketplace-template/commit/c4c046d34d5cd031d69dc02e2c1b6c03b3f54967) if you want to add custom message to any existing form field.




## Social Media / Community

### Groups

#### Permissions explained - group properties

Note. This is a work in progress. Wording might change.  

**boolean properties**: yes | no
- ask_to_join - non-members can ask to join this group

**role based**: anonynous | member (moderator admin etc)
- meta_visible: _role_ can see groups's metadata (title, description)
- content_visible: _role_ can see group's content (activity, content, members)
- approve_request: _role_  can approve new members, if *anonymous* request gets auto approved
- post_content: _role_ can post content to this group
- invite_member: _role_ can invite new members

##### sample groups

    secret: 
      ask_to_join: no
      meta_visible: member
      content_visible: member
      approve_request: member
      post_content: member
      invite_member: member
      
    private: 
      ask_to_join: yes
      meta_visible: anonymous
      content_visible: member
      approve_request: member
      post_content: member
      invite_member: member

### following

- user can follow user
- TDB user can follow anything, category [topic] / item

### activity feeds

- activity record after creation can be published to the following feeds:

  - user-public

    stream of activities accesible to everyone

  - user-private

    private activities stream visible only to related user

  - user-audience

    private streams of users which follows the user

  - custom-audit [1]

    all activities - visible

  - custom-items [2]

    created items

### activities

- user_followed_user

  actor = follower, target = followed

  - target:private
  - actor:public
  - actor:audience

- user_created_item

  actor = owner, audience = followers

  - actor:private
  - actor:public
  - actor:audience

- user_created_order

  actor = customer, audience = item's owner

  - actor:private
  - target:audience



## Categories

categories can be adjusted by:
- /admin/categories
- adding a translation to the `app/translations/en_categories.liquid` file

## Spam protection

For spam protection, the built-in hCaptcha integration is used. By default it is disabled, if you would like to enable it, set VERIFY_HCAPTCHA constant to true:

```
mutation set_constant {
  constant_set(name: "VERIFY_HCAPTCHA", value: "true") {
    name
  }
}
```


## Generators

To imporve workflow with creating new resource you can use generator that will create boilerplate files for your.
Generators follow development guidelines.


### CRUD

CRUD generator will create all files needed to create, update, delete.

```
  ./scaffold/bin/generate resource --help

    Usage: generate <model_name> <attribute_name:type_attribute...> ex. generate car car_model:string year:integer

    Generate model files for basic operations create, read, update, delete
```

Resource generator is expecting model name, list of fields with names and their types.
```
  ./scaffold/bin/generate resource car model:string color:string year:int
    create scaffold/generators/crud/templates/translations/cars.yml
    create app/model_schemas/car.yml
    create app/graphql/cars/create.graphql
    create app/graphql/cars/delete.graphql
    create app/graphql/cars/search.graphql
    create app/graphql/cars/update.graphql
    create app/views/partials/lib/queries/cars/find.liquid
    create app/views/partials/lib/queries/cars/search.liquid
    create app/views/partials/lib/commands/cars/create.liquid
    create app/views/partials/lib/commands/cars/create/build.liquid
    create app/views/partials/lib/commands/cars/create/check.liquid
    create app/views/partials/lib/commands/cars/delete.liquid
    create app/views/partials/lib/commands/cars/delete/check.liquid
    create app/views/partials/lib/commands/cars/update/build.liquid
    create app/views/partials/lib/commands/cars/update/check.liquid
    create app/views/pages/cars/create.liquid
    create app/views/pages/cars/delete.liquid
    create app/views/pages/cars/edit.liquid
    create app/views/pages/cars/index.liquid
    create app/views/pages/cars/new.liquid
    create app/views/pages/cars/show.liquid
    create app/views/pages/cars/update.liquid
    create app/views/partials/theme/simple/cars/edit.liquid
    create app/views/partials/theme/simple/cars/empty_state.liquid
    create app/views/partials/theme/simple/cars/form.liquid
    create app/views/partials/theme/simple/cars/index.liquid
    create app/views/partials/theme/simple/cars/new.liquid
    create app/views/partials/theme/simple/cars/show.liquid
```

After deploy you can access page when you can list, create, update and delete objects: https://your-instance-domain.com/cars

Now you have good place to start in customizing it to your needs.


### REST API

REST API generator will create json endpoints

```
  ./scaffold/bin/generate rest-api --help

    Usage: generate <model_name>

    Example:

    generate rest-api car

```

REST api generator is expecting model name.

```
./scaffold/bin/generate rest-api car
   create app/views/pages/api/cars/create.json.liquid
   create app/views/pages/api/cars/delete.json.liquid
   create app/views/pages/api/cars/show.json.liquid
   create app/views/pages/api/cars/update.json.liquid
REST api endpoints generated

```

### COMMAND

COMMAND generator will create command with build and check steps

```
  ./scaffold/bin/generate command --help

    Usage: generate-command <command_name>

    Generate command with build and check phase.
    Example:

    generate command orders/cancel
```

COMMAND generator is expecting command name

```
./scaffold/bin/generate command users/verify
   create app/views/partials/lib/commands/users/verify.liquid
   create app/views/partials/lib/commands/users/verify/build.liquid
   create app/views/partials/lib/commands/users/verify/check.liquid
Command generated
```

### For automation / CI/CD purposes:

    docker run -u $(id -u ${USER}):$(id -g ${USER}) -it --rm -v $(pwd):/app -w /app node:12-alpine npm install
    docker run -u $(id -u ${USER}):$(id -g ${USER}) -it --rm -v $(pwd):/app -w /app node:12-alpine ./scaffold/bin/generate resource RESOURCENAME PROPERTY:TYPE ...



## Tests

### E2E Tests

[Testcafe](https://devexpress.github.io/testcafe/) tests are located in `test/` directory.

To run tests:
1. Clean your instance and seed test data:

  It might not be neccessary in many cases but some tests require a clean slate and will fail if previous content existed. You might need to clean all the data from your instance by using

  ```
  pos-cli data clean <YOUR_ENV_NAME>
  ```

  And after that seed the test data

  ```
  pos-cli data import --path=./seed/data.zip --zip <YOUR_ENV_NAME>
  ```

  For your convenience, a script was created to do just that:

  ```
  ./seed/seed.sh <env>
  ```

2. Set the environment variable

  First **set the environment variable** to point to your instance.

  On **unix-based** operating systems you can do this be prefixing all your commands with:

  ```
  MPKIT_URL=https://your-instance.example.com
  ```

  so your commands should look like this:

  ```
  MPKIT_URL=https://your-instance.example.com testcafe "chromium" test/ --debug-on-fail
  ```

  On **Windows** you just set the variable once in PowerShell using:

  ```
  $env:MPKIT_URL="https://your-instance.example.com"
  ```

3. Run tests

  In headless mode if you have Chromium installed:


  ```
  testcafe "chromium:headless" test/
  ```

  or just using Google Chrome:

  ```
  testcafe "chrome" test/
  ```

4. Debug

  To manually debug in case when test fails:

  ```
  testcafe "chromium" test/ --debug-on-fail
  ```

  To save screenshots of test fails:
  ```
  testcafe "chromium" test/ -s takeOnFails=true
  ```


### E2E Test Report

To make test report as page (with screenshots):
```
  MPKIT_URL=https://your-instance.example.com testcafe chrome:headless test/ report --reporter html:app/views/pages/_test_results/index.liquid -s path=test/screenshots/,takeOnFails=true
```

Then open your browser and you can visit it at:
```
  https://your-instance.example.com/_test_results
```


### Unit Tests

Put tests into `app/views/partials/test/commands`, files should end with `_test.liquid`.
To run all tests deploy code on instance and go to page:

    https://your-instance.example.com/tests/run

To run one test go to page:

    https://your-instance.example.com/tests/run?name=commands/items/create/check_test

Use assertion partials from `app/views/partials/test/assertions`.


## Continuous Integration with GitHub actions

To enable GH actions you have to set your CI instance variables:
```
  MPKIT_URL_PR
  MPKIT_URL_QA
  MPKIT_URL_LIVE
  MPKIT_EMAIL
  MPKIT_TOKEN
```

MPKIT_EMAIL, and MPKIT_TOKEN variables are for authenticity validation.

MPKIT_URL_PR, MPKIT_URL_QA and MPKIT_URL_LIVE variables are CI instances, where we want to deploy, and run tests, if tests pass this will trigger deploy on live instance.

To set these variables, go to your repository settings, then enter 'Secrets' section from navigation menu at left side.

Now you are able to add 'repository secret' by hitting 'New repository secret' button on the right.

In name field you have to type name of variable, for example:

```
  Name: MPKIT_URL_QA
  Value: https://your-qa-instance.example.com/
```

### How this workflow works?

pull_requests will be triggered when someone in your repository performs a pull request, this will deploy your code to MPKIT_URL_PR instance, and tests will be executed.

Push_master will be triggered after merge to master, this will deploy your code to MPKIT_URL_QA instance, tests will be executed, if tests pass this will trigger deploy on live instance.

### Set workflow

All workflow files can be found in .github/workflows directory. For complete installation instructions visit [Quickstart for GitHub Actions](https://docs.github.com/en/free-pro-team@latest/actions/quickstart).



## Updating your related app

You will most probably clone the repository and build your own app based on this template. In the meantime it is probable that the core template will be updated as well. If you’d like to update your dependent project with the changes applied to the template you can merge those to your own repository.

First, set the upstream to the template repository:

```
git remote add upstream git@github.com:Platform-OS/product-marketplace-template.git
```

After doing this once, you will be able to merge changes from the template to your own project repository:

```
git checkout master
git pull
git checkout -b update
git fetch upstream
git merge upstream/master --no-commit
```

After this you will most likely have to resolve some conflicts if your code differs from the template. It is up to you to choose which changes would you like to keep and which will be overwriten by the changes in template. When you resolve the conflicts and keep only the changes you want, you just need to push them to your repository:

```
git add *
git commit -m "Resolving conflicts after update"
git push
```

After those operations you will have a separate branch that has been updated with the code from the main template repository.



## Stripe integration

Use real US address like:

```
722 Laurel Ave
Burlingame
CA
94010
USA
```
