import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface SaxOption {
    label: string;
    description?: string;
    value: any;
}

interface SaxSelectProps {
    badge: string;
    question: string;
    options: SaxOption[];
    onSelect: (value: any) => void;
}

export const SaxSelect: React.FC<SaxSelectProps> = ({ badge, question, options, onSelect }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((input, key) => {
        if (key.upArrow) {
            setSelectedIndex(i => (i - 1 + options.length) % options.length);
        } else if (key.downArrow) {
            setSelectedIndex(i => (i + 1) % options.length);
        } else if (key.return) {
            onSelect(options[selectedIndex].value);
        }
    });

    return (
        <Box flexDirection="column" marginY={1}>
            {/* Badge and Question: Short Badge style inspired by the screenshot */}
            <Box marginBottom={1}>
                <Box backgroundColor="#1e3a8a" paddingX={1} marginRight={1}>
                    <Text color="white" bold>☐ {badge}</Text>
                </Box>
                <Text bold>{question}</Text>
            </Box>

            {/* Options List */}
            <Box flexDirection="column">
                {options.map((option, i) => {
                    const isSelected = i === selectedIndex;
                    return (
                        <Box key={i} flexDirection="column" marginLeft={1} marginBottom={i === options.length - 1 ? 0 : 0}>
                            <Box flexDirection="row">
                                <Text color={isSelected ? '#3b82f6' : 'white'} bold={isSelected}>
                                    {isSelected ? '❯ ' : '  '}
                                    {i + 1}. {option.label}
                                </Text>
                            </Box>
                            {option.description && (
                                <Box marginLeft={4} marginBottom={1}>
                                    <Text color="gray" dim>{option.description}</Text>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>

            <Box marginTop={1} borderStyle="single" borderColor="gray" borderTop={true} borderBottom={false} borderLeft={false} borderRight={false} />
        </Box>
    );
};
