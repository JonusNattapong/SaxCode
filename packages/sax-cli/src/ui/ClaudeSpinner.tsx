import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

const CLAUDE_ORANGE = '#da7756';
const TEARDROP_ASTERISK = '✻';

export const ClaudeSpinner: React.FC<{ 
    message: string, 
    duration?: number, 
    tokens?: number
}> = ({ message, duration, tokens }) => {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame(f => (f + 1) % (message.length + 10));
        }, 80);
        return () => clearInterval(timer);
    }, [message]);

    const renderGlimmer = (text: string, glimmerIdx: number) => {
        return text.split('').map((char, i) => {
            const distance = Math.abs(i - glimmerIdx);
            let color = 'gray';
            let dim = true;
            let bold = false;

            if (distance === 0) {
                color = '#ffffff';
                dim = false;
                bold = true;
            } else if (distance === 1) {
                color = CLAUDE_ORANGE;
                dim = false;
            } else if (distance === 2) {
                color = '#da7756';
                dim = true;
            }

            return (
                <Text key={i} color={color} dimColor={dim} bold={bold}>
                    {char}
                </Text>
            );
        });
    };

    return (
        <Box flexDirection="row">
            <Text color="red" bold>{TEARDROP_ASTERISK} </Text>
            <Box>
                {renderGlimmer(message, frame)}
            </Box>
            {(duration !== undefined || tokens !== undefined) && (
                <Text color="gray" dim>
                    {` (${duration !== undefined ? duration + 's' : ''}${duration !== undefined && tokens !== undefined ? ' · ' : ''}${tokens !== undefined ? '↓ ' + tokens + ' tokens' : ''})`}
                </Text>
            )}
        </Box>
    );
};
