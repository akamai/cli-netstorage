pipeline {
  agent any
  stages {
    stage('Initialize') {
      steps {
        sh 'npm install'
        echo 'Initialization complete'
      }
    }
    stage('Create') {
      steps {
        sh 'bin/akamaiProperty create jenkins.$BUILD_NUMBER.com --clone jenkins.base.property'
        echo 'Property created'
      }
    }
    stage('Modify') {
      steps {
        sh 'bin/akamaiProperty modify jenkins.$BUILD_NUMBER.com --origin jenkins.origin.com'
        sh 'bin/akamaiProperty modify jenkins.$BUILD_NUMBER.com --origin origin.jenkins.com'
      }
    }
    stage('Retrieve') {
      steps {
        sh 'bin/akamaiProperty retrieve jenkins.$BUILD_NUMBER.com --file rules.json'
      }
    }
    stage('Update') {
      steps {
        sh 'bin/akamaiProperty update jenkins.$BUILD_NUMBER.com --file rules.json'
      }
    }
  }
}