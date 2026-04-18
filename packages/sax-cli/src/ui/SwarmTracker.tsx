import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

export interface SwarmTask {
    id: string;
    type: 'think' | 'tool' | 'subagent' | 'file';
    status: 'pending' | 'running' | 'completed' | 'error';
    label: string;
    description?: string;
    assignee?: string;
}

interface SwarmTrackerProps {
    tasks: SwarmTask[];
    activeAgentName?: string;
}

const InlineSpinner = () => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const [frame, setFrame] = useState(0);
    
    useEffect(() => {
        const timer = setInterval(() => setFrame(f => (f + 1) % frames.length), 80);
        return () => clearInterval(timer);
    }, []);
    return <Text color="blue">{frames[frame]}</Text>;
};

export const SwarmTracker: React.FC<SwarmTrackerProps> = ({ tasks, activeAgentName = "Agent OS" }) => {
    return (
        <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray" paddingX={1}>
            {/* Header */}
            <Box justifyContent="space-between" marginBottom={1}>
                <Text bold>🤖 {activeAgentName}</Text>
                <Text color="green" dimColor>● Executing tasks...</Text>
            </Box>

            {/* Task List */}
            <Box flexDirection="column">
                {tasks.map((task) => {
                    let icon: React.ReactNode = '•';
                    let color = 'gray';
                    
                    if (task.status === 'completed') {
                        icon = '✓';
                        color = 'green';
                    } else if (task.status === 'running') {
                        icon = <InlineSpinner />;
                        color = 'blue';
                    } else if (task.status === 'error') {
                        icon = '✗';
                        color = 'red';
                    }

                    return (
                        <Box key={task.id} flexDirection="column" marginLeft={1}>
                            <Box flexDirection="row">
                                <Box width={3}>
                                    <Text color={color}>{icon}</Text>
                                </Box>
                                <Box flexGrow={1}>
                                    <Text color={task.status === 'completed' ? 'gray' : 'white'} dimColor={task.status === 'completed'}>
                                        {task.label}
                                    </Text>
                                    {task.assignee && (
                                        <Text color="cyan" dimColor>  [{task.assignee}]</Text>
                                    )}
                                </Box>
                            </Box>
                            {task.description && task.status === 'running' && (
                                <Box marginLeft={3} marginBottom={1}>
                                    <Text color="gray" dimColor>{task.description}</Text>
                                </Box>
                            )}
                        </Box>
                    );
                })}
                
                {tasks.length === 0 && (
                    <Box marginLeft={1}><Text color="gray" dim>Initializing swarm logic...</Text></Box>
                )}
            </Box>
        </Box>
    );
};
