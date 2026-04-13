import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { getUsageHistory, UsageRecord, aggregateDaily, calculateStreaks, DailyActivity } from '@sax/agent-core';
import asciichart from 'asciichart';
import chalk from 'chalk';
import figures from 'figures';

const CLAUDE_ORANGE = chalk.hex('#da7756');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const StatsView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [history, setHistory] = useState<UsageRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'Overview' | 'Models'>('Overview');
    const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 80);

    useEffect(() => {
        getUsageHistory().then(setHistory);
        const handleResize = () => setTerminalWidth(process.stdout.columns || 80);
        process.stdout.on('resize', handleResize);
        return () => { process.stdout.off('resize', handleResize); };
    }, []);

    const daily = useMemo(() => aggregateDaily(history), [history]);
    const { current: currentStreak, longest: longestStreak } = useMemo(() => calculateStreaks(daily), [daily]);

    useInput((input, key) => {
        if (key.escape || input === 'q') onClose();
        if (input === 'm') setActiveTab('Models');
        if (input === 'o') setActiveTab('Overview');
        if (key.tab) {
            setActiveTab(prev => prev === 'Overview' ? 'Models' : 'Overview');
        }
    });

    const totalTokens = history.reduce((acc, curr) => acc + curr.inputTokens + curr.outputTokens, 0);
    
    const modelUsage = useMemo(() => {
        const counts: Record<string, { total: number, in: number, out: number }> = {};
        history.forEach(h => {
            if (!counts[h.model]) counts[h.model] = { total: 0, in: 0, out: 0 };
            counts[h.model].total += (h.inputTokens + h.outputTokens);
            counts[h.model].in += h.inputTokens;
            counts[h.model].out += h.outputTokens;
        });
        return Object.entries(counts).sort((a,b) => b[1].total - a[1].total);
    }, [history]);

    const favoriteModel = modelUsage[0]?.[0] || 'N/A';

    const renderHeatmap = () => {
        const width = 52;
        const today = new Date();
        const startDay = new Date(today);
        startDay.setDate(today.getDate() - (width * 7) + (7 - today.getDay()));
        
        const activityMap = new Map(daily.map(d => [d.date, d.messageCount]));
        const counts = daily.map(d => d.messageCount).sort((a,b) => a-b);
        const p75 = counts[Math.floor(counts.length * 0.75)] || 1;
        const p50 = counts[Math.floor(counts.length * 0.50)] || 1;
        
        const grid: string[][] = Array.from({ length: 7 }, () => Array(width).fill(chalk.gray('.')));
        const monthLineArr: string[] = Array(width * 2).fill(' ');

        let lastMonth = -1;
        for (let w = 0; w < width; w++) {
            const weekDate = new Date(startDay);
            weekDate.setDate(startDay.getDate() + (w * 7));
            
            if (weekDate.getMonth() !== lastMonth) {
                const name = MONTH_NAMES[weekDate.getMonth()];
                const pos = w * 2;
                if (pos < monthLineArr.length - 2) {
                    monthLineArr[pos] = name[0];
                    monthLineArr[pos+1] = name[1];
                    monthLineArr[pos+2] = name[2];
                }
                lastMonth = weekDate.getMonth();
            }

            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(weekDate);
                dayDate.setDate(weekDate.getDate() + d);
                const dateStr = dayDate.toISOString().split('T')[0];
                const count = activityMap.get(dateStr) || 0;
                
                if (dayDate > today) { grid[dayDate.getDay()][w] = ' '; continue; }
                
                if (count > 0) {
                    if (count >= p75) grid[dayDate.getDay()][w] = CLAUDE_ORANGE('█');
                    else if (count >= p50) grid[dayDate.getDay()][w] = CLAUDE_ORANGE('▓');
                    else if (count >= 1) grid[dayDate.getDay()][w] = CLAUDE_ORANGE('░');
                }
            }
        }

        const dayLabels = ['   ', 'Mon', '   ', 'Wed', '   ', 'Fri', '   '];

        return (
            <Box flexDirection="column" marginTop={1}>
                <Box marginLeft={5}><Text color="gray" dim>{monthLineArr.join('')}</Text></Box>
                {grid.map((row, i) => (
                    <Box key={i}>
                        <Box width={5}><Text color="gray" dim>{dayLabels[i]}</Text></Box>
                        <Text>{row.join(' ')}</Text>
                    </Box>
                ))}
                <Box marginTop={1} marginLeft={5}>
                    <Text color="gray" dim>Less . </Text>
                    <Text color="#da7756">░ ▒ ▓ █ </Text>
                    <Text color="gray" dim> More</Text>
                </Box>
            </Box>
        );
    };

    return (
        <Box flexDirection="column">
            <Text color="gray" dim>────────────────────────────────────────────────────────────────────────────────</Text>
            <Box marginBottom={1}>
                {activeTab === 'Overview' ? 
                    <Text bold><Text backgroundColor="#e05252" color="white"> Overview </Text> <Text color="gray"> Models </Text></Text> 
                  : <Text bold><Text color="gray"> Overview </Text> <Text backgroundColor="#e05252" color="white"> Models </Text></Text>
                }
            </Box>
            
            <Box flexDirection="column" paddingX={2}>
                {activeTab === 'Overview' ? (
                    <>
                        {renderHeatmap()}
                        <Box marginTop={1} flexDirection="column">
                            <Box marginBottom={1}><Text color="red" bold>All time</Text><Text color="gray" dim> · Last 7 days · Last 30 days</Text></Box>
                            <Box>
                                <Box flexDirection="column" width={45}>
                                    <Text color="gray">Favorite model: <Text color="#da7756" bold>{favoriteModel}</Text></Text>
                                    <Text color="gray">Sessions: <Text color="#da7756" bold>{history.length}</Text></Text>
                                    <Text color="gray">Active days: <Text color="#da7756" bold>{daily.length}/365</Text></Text>
                                    <Text color="gray">Most active day: <Text color="#da7756" bold>{daily.sort((a,b) => b.messageCount - a.messageCount)[0]?.date || 'N/A'}</Text></Text>
                                </Box>
                                <Box flexDirection="column">
                                    <Text color="gray">Total tokens: <Text color="#da7756" bold>{(totalTokens / 1_000_000).toFixed(1)}m</Text></Text>
                                    <Text color="gray">Longest session: <Text color="#da7756" bold>0h 45m 12s</Text></Text>
                                    <Text color="gray">Longest streak: <Text color="#da7756" bold>{longestStreak} days</Text></Text>
                                    <Text color="gray">Current streak: <Text color="#da7756" bold>{currentStreak} day</Text></Text>
                                </Box>
                            </Box>
                        </Box>
                        <Box marginTop={1}>
                            <Text color="cyan">{figures.info} You've used ~{(totalTokens / 95000).toFixed(1)}x more tokens than The Catcher in the Rye</Text>
                        </Box>
                    </>
                ) : (
                    <Box flexDirection="column">
                        <Text color="gray" bold>Tokens per Day</Text>
                        <Box marginY={1}><Text color="#da7756">{asciichart.plot(daily.length > 0 ? daily.map(d => d.totalTokens) : [0,0,0], { height: 6, colors: [asciichart.magenta] })}</Text></Box>
                        {modelUsage.map(([model, usage], i) => (
                            <Box key={i} marginBottom={1} flexDirection="column">
                                <Box><Text color="white" bold>• {model} </Text><Text color="gray" dim>({((usage.total / totalTokens) * 100).toFixed(1)}%)</Text></Box>
                                <Box marginLeft={2}><Text color="gray">In: {(usage.in/1000).toFixed(1)}k · Out: {(usage.out/1000).toFixed(1)}k</Text></Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            <Box marginTop={1} paddingX={2} borderStyle="single" borderColor="gray" borderDimColor>
                <Text color="gray" dim>Esc to close · O Overview · M Models · Tab Switch · {figures.pointer} Press r to cycle dates</Text>
            </Box>
        </Box>
    );
};
