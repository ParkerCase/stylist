import React from 'react';

const ChatInput: React.FC<any> = (props) => (
  <input
    type="text"
    data-cy="chat-input"
    {...props}
  />
);

export default ChatInput; 