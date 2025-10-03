#!/usr/bin/env node

/**
 * AWS IAM User Information Script
 * 
 * Retrieves detailed information about the IAM user including:
 * - User details
 * - Attached policies
 * - Group memberships
 * - Current permissions
 */

const { IAMClient, GetUserCommand, ListAttachedUserPoliciesCommand, ListGroupsForUserCommand, ListUserPoliciesCommand } = require('@aws-sdk/client-iam');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

class AWSIAMInspector {
  constructor() {
    this.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || 'AKIAVXZJE3S7XRIRYUBC';
    this.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '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';
    this.awsRegion = process.env.AWS_REGION || 'us-east-1';

    this.credentials = {
      accessKeyId: this.awsAccessKeyId,
      secretAccessKey: this.awsSecretAccessKey
    };
  }

  log(message, type = 'info') {
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  async getCallerIdentity() {
    this.log('Retrieving AWS caller identity...', 'info');
    
    try {
      const client = new STSClient({
        region: this.awsRegion,
        credentials: this.credentials
      });

      const command = new GetCallerIdentityCommand({});
      const response = await client.send(command);

      this.log('Caller Identity Retrieved:', 'success');
      console.log(JSON.stringify({
        UserId: response.UserId,
        Account: response.Account,
        Arn: response.Arn
      }, null, 2));

      return response;
    } catch (error) {
      this.log(`Failed to get caller identity: ${error.message}`, 'error');
      throw error;
    }
  }

  async getUserInfo() {
    this.log('Retrieving IAM user information...', 'info');
    
    try {
      const client = new IAMClient({
        region: this.awsRegion,
        credentials: this.credentials
      });

      const command = new GetUserCommand({});
      const response = await client.send(command);

      this.log('User Information Retrieved:', 'success');
      console.log(JSON.stringify({
        UserName: response.User.UserName,
        UserId: response.User.UserId,
        Arn: response.User.Arn,
        CreateDate: response.User.CreateDate,
        PasswordLastUsed: response.User.PasswordLastUsed
      }, null, 2));

      return response.User;
    } catch (error) {
      this.log(`Failed to get user info: ${error.message}`, 'error');
      return null;
    }
  }

  async listAttachedPolicies(userName) {
    this.log(`Listing attached policies for user: ${userName}`, 'info');
    
    try {
      const client = new IAMClient({
        region: this.awsRegion,
        credentials: this.credentials
      });

      const command = new ListAttachedUserPoliciesCommand({
        UserName: userName
      });
      const response = await client.send(command);

      if (response.AttachedPolicies && response.AttachedPolicies.length > 0) {
        this.log('Attached Policies:', 'success');
        response.AttachedPolicies.forEach(policy => {
          console.log(`  - ${policy.PolicyName} (${policy.PolicyArn})`);
        });
      } else {
        this.log('No managed policies attached', 'warning');
      }

      return response.AttachedPolicies;
    } catch (error) {
      this.log(`Failed to list attached policies: ${error.message}`, 'error');
      return [];
    }
  }

  async listInlinePolicies(userName) {
    this.log(`Listing inline policies for user: ${userName}`, 'info');
    
    try {
      const client = new IAMClient({
        region: this.awsRegion,
        credentials: this.credentials
      });

      const command = new ListUserPoliciesCommand({
        UserName: userName
      });
      const response = await client.send(command);

      if (response.PolicyNames && response.PolicyNames.length > 0) {
        this.log('Inline Policies:', 'success');
        response.PolicyNames.forEach(policyName => {
          console.log(`  - ${policyName}`);
        });
      } else {
        this.log('No inline policies', 'info');
      }

      return response.PolicyNames;
    } catch (error) {
      this.log(`Failed to list inline policies: ${error.message}`, 'error');
      return [];
    }
  }

  async listGroups(userName) {
    this.log(`Listing groups for user: ${userName}`, 'info');
    
    try {
      const client = new IAMClient({
        region: this.awsRegion,
        credentials: this.credentials
      });

      const command = new ListGroupsForUserCommand({
        UserName: userName
      });
      const response = await client.send(command);

      if (response.Groups && response.Groups.length > 0) {
        this.log('Group Memberships:', 'success');
        response.Groups.forEach(group => {
          console.log(`  - ${group.GroupName} (${group.Arn})`);
        });
      } else {
        this.log('Not member of any groups', 'info');
      }

      return response.Groups;
    } catch (error) {
      this.log(`Failed to list groups: ${error.message}`, 'error');
      return [];
    }
  }

  async run() {
    console.log('\n' + '='.repeat(80));
    console.log('AWS IAM USER INFORMATION REPORT');
    console.log('='.repeat(80) + '\n');

    try {
      // Get caller identity
      const identity = await this.getCallerIdentity();
      console.log('');

      // Get user info
      const user = await this.getUserInfo();
      console.log('');

      if (user) {
        // List attached policies
        await this.listAttachedPolicies(user.UserName);
        console.log('');

        // List inline policies
        await this.listInlinePolicies(user.UserName);
        console.log('');

        // List groups
        await this.listGroups(user.UserName);
        console.log('');
      }

      console.log('='.repeat(80));
      this.log('IAM inspection completed', 'success');
      console.log('='.repeat(80) + '\n');

    } catch (error) {
      console.log('\n' + '='.repeat(80));
      this.log(`IAM inspection failed: ${error.message}`, 'error');
      console.log('='.repeat(80) + '\n');
    }
  }
}

// Check if AWS SDK IAM client is available
async function checkSDKAvailability() {
  try {
    require.resolve('@aws-sdk/client-iam');
    require.resolve('@aws-sdk/client-sts');
    return true;
  } catch (error) {
    console.log('❌ AWS SDK IAM client not installed.');
    console.log('ℹ️  Installing required packages...\n');
    
    const { execSync } = require('child_process');
    try {
      execSync('npm install @aws-sdk/client-iam @aws-sdk/client-sts --save-dev', { 
        stdio: 'inherit' 
      });
      return true;
    } catch (installError) {
      console.log('❌ Failed to install AWS SDK packages');
      return false;
    }
  }
}

// Main execution
if (require.main === module) {
  checkSDKAvailability().then(available => {
    if (available) {
      const inspector = new AWSIAMInspector();
      inspector.run().catch(console.error);
    } else {
      process.exit(1);
    }
  });
}

module.exports = AWSIAMInspector;
