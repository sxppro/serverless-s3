import { AWS } from '@serverless/typescript';

import {
  dispatchFileUploadedEvent as dispatchFileUpload,
  getSignedDownloadUrl,
  getSignedUploadUrl,
} from './functions/config';
import { ref } from './libs/cloudformation';
import { Bucket } from './resources/s3';

import {
  getDownloadUrlAuthorizer,
  getUploadUrlAuthorizer,
  listFiles,
  onFileUploaded,
} from './examples/allowMe/functions/config';
import { FileTable, FileTableArn, FileTableName } from './resources/dynamodb';
import { EventBridge } from './resources/event-bridge';

const cloudformationResources: AWS['resources']['Resources'] = {
  Bucket,
  FileTable,
  EventBridge,
};

const serverlessConfiguration: AWS = {
  service: 'S4',
  frameworkVersion: '3',

  // Serverless dashboard
  // org: 'your-org',
  // app: 'your-app',

  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    region: 'ap-southeast-2',
    environment: { AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1' },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Resource: [
          {
            'Fn::Join': ['', [{ 'Fn::GetAtt': ['Bucket', 'Arn'] }, '/*']],
          },
        ],
        Action: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
      },
      {
        Effect: 'Allow',
        Resource: [{ 'Fn::GetAtt': ['FileTable', 'Arn'] }],
        Action: [
          'dynamodb:Query',
          'dynamodb:GetItem',
          'dynamodb:DeleteItem',
          'dynamodb:PutItem',
        ],
      },
      {
        Effect: 'Allow',
        Resource: [{ 'Fn::GetAtt': ['EventBridge', 'Arn'] }],
        Action: ['events:PutEvents'],
      },
    ],
    httpApi: {
      payload: '2.0',
      cors: {
        allowedOrigins: ['*'],
        allowedHeaders: ['Content-Type', 'Origin'],
        allowedMethods: ['POST', 'OPTIONS', 'GET'],
      },
    },
  },

  functions: {
    getDownloadUrlAuthorizer,
    getUploadUrlAuthorizer,
    getSignedUploadUrl,
    getSignedDownloadUrl,
    dispatchFileUpload,
    onFileUploaded,
    listFiles,
  },

  package: {
    patterns: ['!node_modules/**'],
    individually: true,
  },

  plugins: ['serverless-esbuild'],

  resources: {
    Resources: cloudformationResources,
    Outputs: {
      FileTableName,
      FileTableArn,
    },
  },

  custom: {
    bucketName: ref({ Bucket }),
    fileTableName: ref({ FileTable }),
    fileTableStreamArn: { 'Fn::GetAtt': ['FileTable', 'StreamArn'] },
    fileTableArn: { 'Fn::GetAtt': ['FileTable', 'Arn'] },
    eventBusName: ref({ EventBridge }),
    eventBridgeArn:
      'arn:aws:events:#{AWS::Region}:#{AWS::AccountId}:event-bus/s4',
    getSignedDownloadUrlArn: {
      'Fn::GetAtt': ['GetSignedDownloadUrlLambdaFunction', 'Arn'],
    },
    getSignedUploadUrlArn: {
      'Fn::GetAtt': ['GetSignedUploadUrlLambdaFunction', 'Arn'],
    },
  },
};

module.exports = serverlessConfiguration;
