import type { Meta, StoryObj } from '@storybook/react';

import { Alert, AlertTitle, AlertDescription } from './alert';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a default alert message.',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'This is a destructive alert message.',
  },
};

export const WithTitle: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        There was an error processing your request. Please try again.
      </AlertDescription>
    </Alert>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Alert>
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This is a longer alert message that contains multiple lines of text. It demonstrates how the alert component handles longer content and maintains proper spacing and readability. The alert should automatically adjust its height to accommodate the content.
      </AlertDescription>
    </Alert>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Alert>
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <AlertTitle>Action Required</AlertTitle>
      <AlertDescription>
        Please update your profile information to continue using the application.
      </AlertDescription>
      <div className="mt-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
          Update Profile
        </button>
      </div>
    </Alert>
  ),
};