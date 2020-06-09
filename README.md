# Bedsheets

[![Badge: Github Actions](https://img.shields.io/github/workflow/status/awendland/bedsheets/Full%20Pipeline)](https://github.com/awendland/bedsheets/actions) [![Badge: Docker Image](https://img.shields.io/docker/image-size/bedsheets/rest-server?label=docker%20image)](https://hub.docker.com/r/bedsheets/rest-server) ![Badge: Node Version](https://img.shields.io/node/v/@bedsheets/rest-server) [![Badge: License](https://img.shields.io/github/license/awendland/bedsheets)](https://en.wikipedia.org/wiki/MIT_License) [![Badge: Github Stars](https://img.shields.io/github/stars/awendland/bedsheets?style=social)](https://github.com/awendland/bedsheets)

`bedsheets` is a Node.js proxy that lets you turn Google Sheets into a quick and dirty RESTful database. It's intended to be:

- **your simplest database**, if you need something more complex look at our [suggested alternatives](#suggested-alternatives)
- **no-maintenance**, so that you can deploy it once and forget about things
- **self-hosted**, so that you don't have to risk unreliable or insecure 3rd-party services (plus, you can usually host it for free on most cloud providers!)

<img height="18px" src="https://user-images.githubusercontent.com/1152104/83938433-fa99dd80-a788-11ea-9988-47f4e9caf288.png" /> Google Sheets provides several great database features: [built-in version control &#x29C9;](https://support.google.com/docs/answer/190843), [collaborative management &#x29C9;](https://support.google.com/docs/answer/9331169), [a great table browser &#x29C9;](https://itnext.io/using-google-sheets-as-a-database-for-react-apps-6c15b4481680), [powerful data processing functions &#x29C9;](https://support.google.com/docs/answer/9330962), and [basic visualization tools &#x29C9;](https://developers.google.com/chart/interactive/docs/spreadsheets). By following simple conventions Bedsheets lets you introduce table schemas [see docs](#sheet-schema) and expose them over HTTP(S) with REST endpoints and JSON payloads.

Bedsheets is not trying to compete with real databases. Instead, it's trying to provide a database with a lower barrier to entry for small projects that you think _"wow, it would be nice if this had a database, but I don't want to go through the hassle of deploying/configuring/maintaining the infrastructure for one"_. For example, [@awendland](https://github.com/awendland) uses it to store temperature data recorded by a Raspberry Pi.

## Demo

![Screen-recording showing a browser open to a Google Sheet on the left and a terminal open on the right. A curl command is entered into the terminal to perform a GET operation, which returns the data from the Google Sheet in a JSON format. A second curl command is run to POST new data to the sheet, and the Google Sheet on the left updates in real time. A third curl command is run to GET the Google Sheet's data, which includes the newly added data. Then, the Google Sheet is edited to change a column labeled "name" to now be "first_name". The GET curl command is run again, and this time the JSON payload is keyed with "first_name" instead of "name".](https://user-images.githubusercontent.com/1152104/83918258-356e2800-a72d-11ea-8e26-43e7970e0509.gif)

The latest version of Bedsheets is auto-deployed to [https://demo-1-3gkwpsop5a-uc.a.run.app](https://demo-1-3gkwpsop5a-uc.a.run.app). A demo spreadsheet [1ajoVZn1zhg3HCF4cRpIZOBFRkNWsfXUC9rwVX_YQ70U](https://docs.google.com/spreadsheets/d/1ajoVZn1zhg3HCF4cRpIZOBFRkNWsfXUC9rwVX_YQ70U/edit?usp=sharing) is configured with a sample schema (it'll reset every 20 minutes).

Take a look at the spreadsheet and then run the following command (or [view in ReqBin](https://reqbin.com/wpm4mwe6)) to see Bedsheets in action:

```sh
curl -X GET "https://demo-1-3gkwpsop5a-uc.a.run.app/1ajoVZn1zhg3HCF4cRpIZOBFRkNWsfXUC9rwVX_YQ70U/Playground"
```

The spreadsheet is publicly editable, so feel free to modify it and test out how the schema system works!

## Table of Contents

<!-- prettier-ignore-start -->
<!-- markdownlint-disable MD012 -->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Usage](#usage)
  - [RESTful API](#restful-api)
    - [Spreadsheet IDs](#spreadsheet-ids)
    - [`GET /{spreadsheet_id}/{sheet_name}`](#get-spreadsheet_idsheet_name)
    - [`GET /{spreadsheet_id}/{sheet_name}/describe`](#get-spreadsheet_idsheet_namedescribe)
    - [`POST /{spreadsheet_id}/{sheet_name}`](#post-spreadsheet_idsheet_name)
    - [Errors](#errors)
      - [Missing Spreadsheet (404)](#missing-spreadsheet-404)
      - [Missing Sheet (404)](#missing-sheet-404)
      - [Misconfigured Sheet (502)](#misconfigured-sheet-502)
      - [Too Many Requests (429)](#too-many-requests-429)
      - [Bad Data (400)](#bad-data-400)
      - [Unknown (400)](#unknown-400)
    - [CORS](#cors)
  - [Sheets Configuration](#sheets-configuration)
    - [Sheet Schema](#sheet-schema)
    - [Manage Access](#manage-access)
- [Deploy](#deploy)
  - [1. Create a Service Account](#1-create-a-service-account)
    - [1.A. Create a Google Cloud Project](#1a-create-a-google-cloud-project)
    - [1.B. Enable the Google Sheets API](#1b-enable-the-google-sheets-api)
    - [1.C. Create a Service Account](#1c-create-a-service-account)
  - [2. Deploy to a Cloud Provider](#2-deploy-to-a-cloud-provider)
    - [Google Cloud Run _(Preferred)_](#google-cloud-run-_preferred_)
    - [Google Cloud Functions](#google-cloud-functions)
    - [AWS Fargate](#aws-fargate)
    - [AWS Lambda](#aws-lambda)
    - [Heroku](#heroku)
  - [General Deployment Info](#general-deployment-info)
    - [Deployment Parameters](#deployment-parameters)
    - [Google Sheets API Credentials](#google-sheets-api-credentials)
    - [Docker](#docker)
- [Comparison to Traditional DBs](#comparison-to-traditional-dbs)
  - [Terminology](#terminology)
- [FAQ](#faq)
  - [What's a _Spreadsheet ID_ or _A1 Notation_?](#whats-a-_spreadsheet-id_-or-_a1-notation_)
  - [How are dates stored in Google Sheets?](#how-are-dates-stored-in-google-sheets)
  - [Why am I getting a 403 error when trying to access my sheet?](#why-am-i-getting-a-403-error-when-trying-to-access-my-sheet)
  - [How much data can I fit in a Google Sheet?](#how-much-data-can-i-fit-in-a-google-sheet)
  - [How many requests can I make per second?](#how-many-requests-can-i-make-per-second)
- [v1.0 Blockers](#v10-blockers)
- [Suggested Alternatives](#suggested-alternatives)
- [Contributing](#contributing)
  - [Project Structure](#project-structure)
    - [Intraproject Package Dependencies](#intraproject-package-dependencies)
    - [Dependency Management](#dependency-management)
    - [Tests](#tests)
    - [Environment Compatibility](#environment-compatibility)
      - [Node](#node)
      - [Typescript](#typescript)
  - [CI](#ci)
  - [Non-Goals](#non-goals)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

## Usage

This assumes you've already deployed Bedsheets ([see instructions](#deploy)). A single Bedsheets deployment can work with as many Google Sheets as you want. You can also test things out using the [demo deployment](#demo).

Brief terminology (see [more terminology here](#terminology)):

- _Spreadsheets_ map to _Databases_.
- _Sheets_ (the tabs on the bottom of the spreadsheet) map to _Tables_.

### RESTful API

Bedsheets exposes database CRUD operations are exposed over HTTP(S) in a RESTful manner. HTTP Methods are used to indicate intent (such as `GET` meaning "retrieve data" and `POST` meaning "append new data"). All response payloads are serialized as JSON. Error codes are used to indicate issues, such as a bad table name returning `404` (see [more information about errors](#errors)).

#### Spreadsheet IDs

Each database (ie. spreadsheet) is represented by a spreadsheet ID. These can be retrieved by looking at the portion of the spreadsheet URL after `https://docs.google.com/spreadsheets/d/` and before the next `/`. For example, `https://docs.google.com/spreadsheets/d/1Hhd74jl8Mrg5r8ZJAg-Loljd92LLeC0_LepA6NBuUbUA/edit#gid=1747294294` has the ID `1Hhd74jl8Mrg5r8ZJAg-Loljd92LLeC0_LepA6NBuUbUA`.

<details>
  <summary><em>expand to see example screenshot</em></summary>

![Google Sheets - Share Link](https://user-images.githubusercontent.com/1152104/83590771-4fc8bb80-a50b-11ea-8f38-3ac07bcb10d8.png)

</details>

#### `GET /{spreadsheet_id}/{sheet_name}`

Retrieve entries from the `{sheet_name}` table. Entries will be returned as an array of objects.

**Additional parameters:**

These should be provided as [query parameters &#x29C9;](https://stackabuse.com/get-query-strings-and-parameters-in-express-js/).

- `offset={positive_integer}` - Only return results after the first `offset` results in the table. Defaults to `0`.

- `limit={positive_integer}` - Constrain the response to only have up to `limit` entries. Defaults to `infinity`.

**Example:**

For a spreadsheet with the following table and data:

> **Sheet1**
> | name | favorite_food | age |
> | ------- | ------------- | --- |
> | Rachel | Broccoli | 23 |
> | Shriank | Pizza | 19 |

The command:

```sh
curl "$DEMO_HOST/$DEMO_SPREADSHEET/Sheet1"
```

Would return:

```json
[
  {
    "name": "Rachel",
    "favorite_food": "Broccoli",
    "age": 23
  },
  {
    "name": "Shriank",
    "favorite_food": "Pizza",
    "age": 19
  }
]
```

While the command:

```sh
curl "$DEMO_HOST/$DEMO_SPREADSHEET/Sheet1?offset=1"
```

Would return:

```json
[
  {
    "name": "Shriank",
    "favorite_food": "Pizza",
    "age": 19
  }
]
```

#### `GET /{spreadsheet_id}/{sheet_name}/describe`

Retrieve information about the `{sheet_name}` table. This method is primarily intended for debugging, so that you can see how Bedsheets is interpreting your sheet configuration.

**Example:**

For a spreadsheet with the following table and data:

> **Sheet1**
> | name | favorite_food | age |
> | ------- | ------------- | --- |
> | Rachel | Broccoli | 23 |
> | Shriank | Pizza | 19 |

The command:

```sh
curl "$DEMO_HOST/$DEMO_SPREADSHEET/Sheet1/describe"
```

Would return:

```json
{
  "headers": ["name", "favorite_food", "age"]
}
```

#### `POST /{spreadsheet_id}/{sheet_name}`

Append new entries to the `{sheet_name}` table. All entries must conform to the table schema otherwise the entire request will reject.

**Additional parameters:**

These should be provided as query parameters.

- `strict={boolean}` - If enabled, request entries must have all keys specified by the table schema and may not have any extra. Defaults to `true` to improve developer experience when first experimenting with Bedsheets.

**Example:**

For a spreadsheet with the following table and data:

> **Sheet1**
> | name | age |
> | ------- | --- |
> | Rachel | 23 |
> | Shriank | 19 |

The command:

```sh
curl -X POST "$DEMO_HOST/$DEMO_SPREADSHEET/Sheet1" --data '[{"name": "Nancy", "age": 35}]"
```

Would return:

```json
{
  "updatedRange": "Sheet1!A4:B4",
  "updatedRowCount": 1
}
```

and the table would be updated to look like:

> **Sheet1**
> | name | age |
> | ------- | --- |
> | Rachel | 23 |
> | Shriank | 19 |
> | Nancy | 35 |

While the command:

```sh
curl -X POST "$DEMO_HOST/$DEMO_SPREADSHEET/Sheet1" --data '[{"name": "Nancy", "weight": 10}]"
```

Would return:

```json
{
  "sheet": "Sheet1",
  "malformedEntries": [
    {
      "value": { "name": "Nancy", "weight": 10 },
      "index": 0,
      "fields": {
        "missing": ["age"],
        "extra": ["weight"]
      }
    }
  ]
}
```

#### Errors

##### Missing Spreadsheet (404)

Returned when the provided _spreadsheet id_ does not correspond to a valid spreadsheet.

```json
{
  "spreadsheetId": "some-bad-id"
}
```

##### Missing Sheet (404)

Returned when the provided _sheet name_ does not correspond to a valid sheet.

```json
{
  "sheet": "NotARealSheet"
}
```

##### Misconfigured Sheet (502)

Returned when the requested sheet has an invalid schema (see [instructions for sheet schema](#sheet-schema)). A reason will be included:

- "NO_HEADERS" occurs when the first row of the sheet is empty
- "DUPLICATE_HEADERS" occurs when the first row contains the same value at least twice

```json
{
  "sheet": "Sheet1",
  "reason": "NO_HEADERS"
}
```

##### Too Many Requests (429)

Returned when the Google Sheets API request quota has been exceeded. See [the FAQ](#how-many-requests-can-i-make-per-second) for a discussion on these limits.

##### Bad Data (400)

Returned when the request payload doesn't match the sheet schema.

```json
{
  "sheet": "Sheet1",
  "malformedEntries": [
    {
      "value": { "name": "Patrick", "weight": 10 },
      "index": 0,
      "fields": {
        "missing": ["age"],
        "extra": ["weight"]
      }
    }
  ]
}
```

##### Unknown (400)

Any other errors thrown by the underlying `googleapis` interface will be logged to `stderr` and will either return the original status code or `400` if no status code was present. They will include the original error `message` in the response payload to assist with immediate debugging without exposing too much sensitive information.

#### CORS

The server will respond to requests with an `Origin` header by reflecting the value back in `Access-Control-Allow-Origin`. It will similarly reflect values for `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`. `OPTIONS` requests will be returned with `204` status codes, unless they request invalid URLs (in which case they will be handled like normal).

This should enable browser-based access to Bedsheet's APIs. To disable CORS support pass `DISABLE_CORS=true` as an environment variable.

### Sheets Configuration

#### Sheet Schema

A simple schema can be enforced for the _database_ (ie. _spreadsheet_, see [terminology](#terminology)).

To create a new _table_, [add a new _sheet_ to the _spreadsheet_ &#x29C9;](https://webapps.stackexchange.com/questions/7968/inserting-a-new-sheet-in-a-google-spreadsheet). The _sheet's_ name will be used as the _table_ name.

The _table's_ schema is set by the values in the first row of the _sheet_. These values define the table's columns. Schemas are parsed during each request, so any changes are reflected immediately in subsequent requests.

The schemas do not support data validation besides ensuring that all columns are present. To treat a column as optional, set the payload value to `null` or an emptry string `""`.

#### Manage Access

To enable Bedsheets to access a spreadsheet you need to invite the Service Account ([see instructions](#1-create-a-service-account)) to the spreadsheet. If you add the Service Account as an _Editor_ on a sheet Bedsheets will have _write_ access to, if you add it as a _Viewer_ then Bedsheets will only have have _read_ access.

You invite the Service Account like you'd invite any other user, via the share menu. The Service Account will have an email address in the form `ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com`.

<details>
  <summary><em>expand to see example screenshots</em></summary>
  
  ![Google Sheets with an open share menu containing the service accounts email address](https://user-images.githubusercontent.com/1152104/83590770-4f302500-a50b-11ea-83dd-742d17af82e1.png)
</details>

## Deploy

The goal of Bedsheets is to be as easy to deploy as possible. The hardest part is preparing the Service Account ([step 1.C.](#1c-create-a-service-account)) that'll be used to interact with Google Sheets. The actual server deployment should be straightforward thanks to Docker and new serverless offerings.

### 1. Create a Service Account

#### 1.A. Create a Google Cloud Project

This project will be used to grant access to the Google Sheets API. If you already have a Google Cloud Project, then you can skip this step.

<details>
  <summary>Step 1. Navigate to the <a href="https://console.developers.google.com">Google Cloud Console &#x29C9;</a> <em>(expand to see a screenshot)</em></summary>
  
  ![001 - Console - Dashboard](https://user-images.githubusercontent.com/1152104/83590732-46d7ea00-a50b-11ea-9335-54ab2d3842a0.png)
</details>

<details>
  <summary>Step 2. Create a new project</summary>
  
  ![002 - Console - New Project](https://user-images.githubusercontent.com/1152104/83590742-493a4400-a50b-11ea-8ec6-cebe97a5ab07.png)
  
  ![003 - Console - New Project - Created](https://user-images.githubusercontent.com/1152104/83590744-4a6b7100-a50b-11ea-9b87-a9ac26e6024e.png)
  
  ![004 - Console - Project - Dashboard](https://user-images.githubusercontent.com/1152104/83590746-4b040780-a50b-11ea-9fbc-f451ff6c863b.png)
</details>

#### 1.B. Enable the Google Sheets API

The Google Sheets API is disabled by default in Google Cloud Projects so you must enable it before Bedsheets can use it.

<details>
  <summary>Step 1. Navigate to the Google Sheets entry in the API Library (<a href="https://console.cloud.google.com/apis/api/sheets.googleapis.com/overview">link &#x29C9;</a>)</summary>
  
  ![105 - Console - Library Menu](https://user-images.githubusercontent.com/1152104/83590751-4b9c9e00-a50b-11ea-97a5-f6c1836e550b.png)
  
  ![106 - Console - Library - Search](https://user-images.githubusercontent.com/1152104/83590753-4b9c9e00-a50b-11ea-93de-a5fcfeb5e7a3.png)
</details>

<details>
  <summary>Step 2. Click "Enable"</summary>
  
  ![107 - Console - Library - Google Sheets](https://user-images.githubusercontent.com/1152104/83590754-4c353480-a50b-11ea-80b9-ddfd71b1d92a.png)
  
  ![108 - Console - Library - Google Sheets - Enabled](https://user-images.githubusercontent.com/1152104/83590755-4ccdcb00-a50b-11ea-8f72-6ed185d85988.png)
</details>

#### 1.C. Create a Service Account

As described by [Google Cloud > Security & Identity Products > Service Accounts &#x29C9;](https://cloud.google.com/iam/docs/service-accounts):

> A service account is a special kind of account used by an application or a virtual machine (VM) instance, not a person. Applications use service accounts to make authorized API calls.

Bedsheets uses a Service Account to perform it's operations. This service account is identified by an email address in the form `ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com`. You can grant it access to specific spreadsheets by inviting it via its email.

For security, the Service Account will be granted the ["Service Account User" &#x29C9;](https://cloud.google.com/iam/docs/understanding-roles#service-accounts-roles) role, which only allows the Service Account to perform standard user operations (such as editing a Google Sheet it was invited to).

<details>
  <summary>Step 1. Create a new Service Account (<a href="https://console.developers.google.com/iam-admin/serviceaccounts/create">link</a>)</summary>
  
  ![200 - Console - Project - Credentials](https://user-images.githubusercontent.com/1152104/83590748-4b040780-a50b-11ea-8b24-051c4809d908.png)
  
  ![201 - Console - Project - Credentials - Create Dropdown](https://user-images.githubusercontent.com/1152104/83590759-4ccdcb00-a50b-11ea-8905-4aa53cd6ccc7.png)
  
  ![202 - Console - Create Service Account](https://user-images.githubusercontent.com/1152104/83590760-4d666180-a50b-11ea-8201-045c4794b3d0.png)
</details>

<details>
  <summary>Step 2. Apply the "Service Account User" role</summary>
  
  ![205 - Console - Create Service Account - Role - Service Account User](https://user-images.githubusercontent.com/1152104/83590761-4dfef800-a50b-11ea-9bcf-5a2eb3660262.png)
</details>

<details>
  <summary>Step 3. Download the Service Account login credentials as JSON<em></em></summary>
  
  ![206 - Console - Create Service Account - Key](https://user-images.githubusercontent.com/1152104/83590764-4e978e80-a50b-11ea-9a79-472655944448.png)
  
  ![207 - Console - Create Service Account - Key - Json](https://user-images.githubusercontent.com/1152104/83590765-4e978e80-a50b-11ea-9328-cb35c8af5abb.png)
</details>

_If you are using Google Cloud Run or Cloud Functions then you can skip the credentials download step and instead assign the Service Account directly to the execution environment which Bedsheets will automatically adopt (see the section on Cloud Providers for more information)._

### 2. Deploy to a Cloud Provider

Bedsheets has been packaged as a Docker image for easy deployment (see [docker](#docker) for general instructions).

#### Google Cloud Run _(Preferred)_

Follow the instructions at [Google Cloud Run: Pre-Built Deploys &#x29C9;](https://cloud.google.com/run/docs/quickstarts/prebuilt-deploy) and use the following parameters:

<details>
  <summary><em>expand to see parameters</em></summary>

_These parameters are biased towards reducing costs._

| Parameter                   | Recommended Value                                                                           | Commentary                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication              | Allow unauthenticated invocations                                                           | this enables standard HTTP REST requests w/ IAM credentials                                                                                                                                         |
| Container image URL         | `gcr.io/bedsheets/rest-server:latest`                                                       |
| Container port              | 8080                                                                                        | the value doesn't matter, since the server will bind to whatever port is in the `$PORT` env var                                                                                                     |
| Container command           | _leave blank_                                                                               | the Docker image's default command will be used                                                                                                                                                     |
| Container arguments         | _leave blank_                                                                               | same as above                                                                                                                                                                                       |
| Service account             | Set to the account you created in [C. Create Service Account](#1c-create-a-service-account) | the server will automatically use the ambient credentials from this service account                                                                                                                 |
| Capacity                    | 80                                                                                          | the server can handle multiple requests, so this value can be set to the max to avoid spinning up extra instances or rejecting requests                                                             |
| Request timeout             | 300                                                                                         | most requests finish in <1, even when 1000s of rows are being returned                                                                                                                              |
| CPU allocated               | 1                                                                                           | the server isn't performing much processing, so a low value is fine                                                                                                                                 |
| Memory allocated            | 256 MiB                                                                                     | the server uses about 100 MiB of memory when handling a single request                                                                                                                              |
| Maximum number of instances | 1                                                                                           | if more than `Capacity` requests come in concurrently, then they will be rejected if autoscaling is 1, which is likely fine since Google Sheets rate limits at 100 requests per 100 seconds anyways |

</details>

As of June 2020, Google Cloud Run provides 180,000 vCPU-seconds per month for free (_we're focused only on this metric since both the memory and request constraints in the free plan are more generous than this CPU restriction_). Since most requests in Bedsheets take ~1 second, this translates to 100,000s requests for free each month!

#### Google Cloud Functions

TODO: A new adapter needs to be written to support the pre-parsed request model adopted by most FaaS providers. <!-- https://cloud.google.com/functions/docs/securing/function-identity#per-function_identity -->

#### AWS Fargate

TODO: `@bedsheets/rest-server` should support the Fargate request model. Needs to be tested. A template should be written so that users can easily get started without needing to draft their own ECS deployment configuration from scratch.

#### AWS Lambda

TODO: See [Google Cloud Functions](#google-cloud-functions).

#### Heroku

TODO: `@bedsheets/rest-server` should support the Heroku request model. Needs to be tested.

<!--
#### Azure Container Instances

TODO: `@bedsheets/rest-server` should support the Container Instances request model. Needs to be tested. A template should be written so that users can easily get started without needing to muck through exposing the right ports and configuring DNS.
-->

### General Deployment Info

#### Deployment Parameters

Bedsheets has several deployment parameters which can be provided as environment variables.

- `PORT` - Which port should Bedsheets bind to? Defaults to `3141`.
- `LOG_LEVEL` - How verbose should logging be? Options are `NONE | ERROR | WARN | INFO | TRACE`. Defaults to `INFO`.

#### Google Sheets API Credentials

Google Sheets API credentials (ie. the credentials for the Service Account) can be supplied to Bedsheets several ways.

- **Runtime Context** - _Recommended (when available)_ - If Bedsheets is being run on Google Cloud Platform then the Service Account can be attached to the runtime environment. Bedsheets will automatically adopt the appropriate credentials from the runtime.
- **Environment Variables** - _Recommended_ - To provide credentials to Bedsheets outside of GCP you should use the environment variables `GOOGLE_AUTH_CLIENT_EMAIL` set to the Service Accounts email and `GOOGLE_AUTH_PRIVATE_KEY` set to the PEM-encoded private key from the credentials JSON. If set, these values will override other forms of authentication.
- **Credentials File** - _Not Recommended_ - Bedsheets will use the information from a Service Account's credentials JSON file if the path to the file is set in the environment variable `GOOGLE_APPLICATION_CREDENTIALS` and the file is accessible to the Bedsheets process.

#### Docker

Bedsheets is available as a Docker image on Docker Hub ([entry &#x29C9;](https://hub.docker.com/repository/docker/bedsheets/rest-server)) under the label `bedsheets/rest-server`. Master is auto-built and tagged as `latest`, and git tags are also built and pushed.

To run Bedsheets locally, use:

```sh
docker run -e GOOGLE_AUTH_CLIENT_EMAIL=$SA_EMAIL GOOGLE_AUTH_PRIVATE_KEY=$SA_PRIVATE_KEY -p 3141:3141 bedsheets/rest-server
```

## Comparison to Traditional DBs

### Terminology

| Bedsheets       | Postgres                                                                                           | Description                                |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Spreadsheet ID  | [Database Name / dbname &#x29C9;](https://www.postgresql.org/docs/9.2/libpq-connect.html#AEN38680) | The instance/server being accessed         |
| Sheet           | Table                                                                                              | The model/entity being retrieved           |
| Editor/Viewer   | Read/Write access                                                                                  | The user's data permissions                |
| Service Account | User                                                                                               | The user/credentials used to access the DB |

## FAQ

### What's a _Spreadsheet ID_ or _A1 Notation_?

See Google's [Sheet API Concepts &#x29C9;](https://developers.google.com/sheets/api/guides/concepts) for an overview of these Google Sheets (and, in the case of _A1 Notation_, general spreadsheet) concepts.

### How are dates stored in Google Sheets?

See Google's [Sheet API Concepts: Date & Time &#x29C9;](https://developers.google.com/sheets/api/guides/concepts#datetime_serial_numbers) section for an overview of how spreadsheets store date & time.

### Why am I getting a 403 error when trying to access my sheet?

There are several trouble-shooting steps to work through:

1. Is the Service Account added as an Editor to the Google Sheet?
2. Is the `spreadsheetId` pointing to the correct sheet? Check by replacing `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` with the `spreadsheetId` that you're providing to Bedsheets and make sure that the correct Google Sheet is appearing.
3. Does the Service Account have the `Service Account User` role?

### How much data can I fit in a Google Sheet?

According to [GSuiteTips &#x29C9;](https://gsuitetips.com/tips/sheets/google-spreadsheet-limitations/) and [SpreadSheetPoint &#x29C9;](https://spreadsheetpoint.com/google-sheets-limitations/), Google Sheets supports a maximum of 5 million cells per spreadsheet, up to 200 tabs, and up to 18,278 columns. A default Sheet will have 26 columns while most use cases only need <10, so it might be possible to extend the number of rows you can have by deleting any empty columns (# rows = # max cells / # columns). I haven't tested these limits yet (TODO test these limits!). Apparently, an update can only add 40,000 new rows at a time as well.

### How many requests can I make per second?

The Google Sheets API quota will be the bottleneck when trying to make many requests. By default, the Google Sheets API permits [100 requests per 100 seconds &#x29C9;](https://developers.google.com/sheets/api/limits) per service account, with reads and writes tracked separately. This may be increasable to 500 requests per 100 seconds by submitting a support request (see [this stackoverflow answer &#x29C9;](https://stackoverflow.com/questions/45225734/how-to-increase-google-sheets-v4-api-quota-limitations/48204596#48204596)).

## v1.0 Blockers

_The following items are currently considered blockers before a v1.0 release will be declared._

1. Support for `PUT` (ie. update) operations.
2. Support for `DELETE` operations.
3. An adapter enabling FaaS deployments (eg. AWS Lambda, Google Cloud Functions).
4. Robust validation of input (consider [io-ts &#x29C9;](https://github.com/gcanti/io-ts/blob/master/index.md)).
5. Standardized, friendly errors for invalid inputs.
6. Determine if basic authentication should be added (a per-deployment secret key? per-spreadsheet?).
7. Consider adding a GraphQL abstraction in addition to REST.

## Suggested Alternatives

See [awesome-serverless's list of databases &#x29C9;](https://github.com/anaibol/awesome-serverless#databases) for a more extensive list of low-maintenance DBs.

## Contributing

### Project Structure

This project uses `lerna` with `yarn workspaces` to manage a variety of packages. To kick things off, run `yarn` in the repo root. To build all packages, run `yarn build:all`. To execute all tests, run `yarn test:all`.

Currently, the project is composed of the following packages:

- `@bedsheets/google-sheets-dal` - This is a data access layer for Google Sheets that abstracts the `sheets_v4.Sheets` API in the `googleapis` package to provide a simpler object array interface for working with Google Sheets. <!-- description:google-sheets-dal -->
- `@bedsheets/rest-server` - This is an HTTP server that exposes the operations from `@bedsheets/google-sheets-dal` in a RESTful way (eg. translating the `append` operation into `POST` requests). <!-- description:rest-server -->
- `@bedsheets/test-helpers` - This is an internal module which provides shared infrastructure for writing integration tests, such as a tool for seeding spreadsheets for testing. <!-- description:test-helpers -->

#### Intraproject Package Dependencies

Yarn Workspaces enables packages to depend directly on each other. These packages still need to be compiled before they can be used though, since they are still consumed through `node_modules` with each `package.json` defining how they should be imported (i.e. consuming them intra-project is the same as an end-user consuming them from the npm registry).

#### Dependency Management

Any dependency that isn't needed for end-user package functionality (such as testing, compilation, or other developer niceties) should be installed as a _dev dependency_ (`yarn add -D package_name`).

Each package should declare all packages that it needs, it should not rely on their ambient availability from the root `package.json`. If a _dev dependency_ is being used by multiple packages, it should be installed via the root `package.json` (using `yarn add -D package_name -W`) and the packages that require it should specify the version as `*` (e.g. see the `typescript` declaration under `devDependencies` in each `packages/*/package.json`).

#### Tests

Tests should be stored under a `tests` folder in each package's folder (e.g. `./packages/google-sheets-dal/tests/`). Tests should be further subdivided into `unit` and `integration`, where _unit tests_ do NOT interact with the internet or other services on the host, and _integration tests_ do rely on external services. Tests should be written in Typescript, and will be run using `jest` and `ts-jest`.

#### Environment Compatibility

##### Node

To ensure that these packages can run across all targeted Node versions `@types/node` should be set to the oldest supported version.

Furthermore, CI should run against the oldest supported version (with the assumption that Node had no breaking changes since).

##### Typescript

TODO: figure out how to test `.d.ts` files against older Typescript versions to ensure that they use syntax that isn't too new.

### CI

Github Actions is used to provide continuous integration services. See `.github/workflows` for details on what's being executed. All CI must pass before PRs will be merged.

### Non-Goals

Bedsheets is aiming to be a maximally simple database for quick/hacky/hobby projects. Therefore, it has several non-goals to avoid feature creep which may impair these core targets:

- **Configurability** - Besides defining table columns Bedsheets is not trying to support any other type of configuration. Bedsheets should not support additional payload validation or column types.
- **Optimized performance** - Bedsheets should not attempt to cache responses from the Google Sheets API in order to reduce latency (such as saving schema to improve append operations). Furthermore, the Bedsheets source code should be easy to read so it's acceptable to use a more beginner friendly approach instead of a more performant one when doing things such as data transformations.
