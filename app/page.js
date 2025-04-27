"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {Checkbox} from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area, AreaChart, Bar, BarChart, ReferenceLine } from "recharts";
import { useTheme } from "next-themes";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const CURRENCY_MAP = {
    "EUR": "€",
    "USD": "$",
    "GBP": "£",
    "JPY": "¥",
    "₩": "₩",
};

export default function Home() {
    const { setTheme } = useTheme("dark");
    const [currency, setCurrency] = useState("$");
    const [detailedEarningsCSV, setDetailedEarningsCSV] = useState({ headers: [], data: [], chart: [], subscribersPerDayChart: [] });
    const [dateRange, setDateRange] = useState("this-month");
    const [year, setYear] = useState(null);
    const [excludeFirstDayOfMonth, setExcludeFirstDayOfMonth] = useState(true);
    const [compareMode, setCompareMode] = useState(false);

    const dateFilter = (subscriber) => {
        const year = subscriber.year;
        const month = subscriber.month;
        const day = subscriber.day;
        if (Number.isFinite(day) && excludeFirstDayOfMonth && day === 1) {
            return false;
        }

        const current = new Date();
        const lastMonth = new Date(current.getFullYear(), current.getMonth() - 1, current.getDate());
        const last2Months = new Date(current.getFullYear(), current.getMonth() - 2, current.getDate());
        const last3Months = new Date(current.getFullYear(), current.getMonth() - 3, current.getDate());
        const lastYear = new Date(current.getFullYear() - 1, current.getMonth(), current.getDate());

        if (dateRange === "all") {
            return true;
        } else if (dateRange === "this-month") {
            return year === current.getFullYear() && month === current.getMonth();
        } else if (dateRange === "last-month") {
            return year === lastMonth.getFullYear() && month === lastMonth.getMonth();
        } else if (dateRange === "last-2-months") {
            return year === last2Months.getFullYear() && (month === lastMonth.getMonth() || month === current.getMonth());
        } else if (dateRange === "last-3-months") {
            return year === last3Months.getFullYear() && (month === last2Months.getMonth() || month === lastMonth.getMonth() || month === current.getMonth());
        } else if (dateRange === "this-year") {
            return year === current.getFullYear();
        } else if (dateRange === "last-year") {
            return year === lastYear.getFullYear();
        }
    };

    const getMonthlyGrossAndProjected = () => {
        const currentMonth = new Date().getMonth();
        const thisMonthData = detailedEarningsCSV.subscribersPerDayChart.filter((subscriber) => subscriber.month === currentMonth && subscriber.year === new Date().getFullYear());
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastYear = currentMonth === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        const lastMonthData = detailedEarningsCSV.subscribersPerDayChart.filter((subscriber) => subscriber.month === lastMonth && subscriber.year === lastYear);
        const medianDailyGrossLastMonth = parseFloat(findMedian(lastMonthData.map((subscriber) => subscriber.gross).sort((a, b) => a - b)));
        const daysUntilEndOfMonth = 30 - Math.max(...thisMonthData.map((subscriber) => subscriber.day));
        const projectedGross = medianDailyGrossLastMonth * daysUntilEndOfMonth;
        const currentMonthGross = thisMonthData.map((subscriber) => parseFloat(subscriber.gross)).reduce((a, b) => a + b, 0);
        const lastMonthGross = lastMonthData.map((subscriber) => parseFloat(subscriber.gross)).reduce((a, b) => a + b, 0);
        const vsLastMonth = ((projectedGross + currentMonthGross) * 100) / lastMonthGross - 100;
        const grossThisTimeLastMonth = lastMonthData
            .filter((subscriber) => subscriber.day <= 30 - daysUntilEndOfMonth)
            .map((subscriber) => parseFloat(subscriber.gross))
            .reduce((a, b) => a + b, 0);
        const topTwoGrossLastMonth = lastMonthData
            .sort((a, b) => b.gross - a.gross)
            .slice(0, 2)
            .map((subscriber) => parseFloat(subscriber.gross))
            .reduce((a, b) => a + b, 0);
        const estimatedGrossLastMonth = topTwoGrossLastMonth + medianDailyGrossLastMonth * 28;
        const specialEventImpact = lastMonthGross - estimatedGrossLastMonth;

        const grossByMonthYear = {};

        const years = [];
        detailedEarningsCSV.subscribersPerDayChart.forEach((subscriber) => {
            const month = subscriber.month + 1;
            const year = subscriber.year;
            const key = `${year}-${month}`;
            if(!years.includes(year)) years.push(year);
            if (!grossByMonthYear[key]) {
                grossByMonthYear[key] = parseFloat(subscriber.gross);
            } else {
                grossByMonthYear[key] += parseFloat(subscriber.gross);
            }
        });

        const monthByMonthGrowth = [];

        Object.values(grossByMonthYear).forEach((gross, index) => {
            const current = gross;
            const prev = Object.values(grossByMonthYear)[index - 1];
            if (!prev) return;
            const growth = current / prev - 1;
            monthByMonthGrowth.push(growth);
        });

        const medianGrowth = findMedian(monthByMonthGrowth);

        const projectedGrossUpper = (projectedGross + currentMonthGross) * (1 + medianGrowth * (daysUntilEndOfMonth / 30));

        const vsLastMonthUpper = (projectedGrossUpper / lastMonthGross - 1) * 100;

        let allTimeGrowth = Object.entries(grossByMonthYear).map(([key, value]) => {
            return {
                date: new Date(key.replaceAll("-", "/")).toLocaleDateString("en-US", { year: "numeric", month: "long" }),
                gross: value.toFixed(0),
                year: new Date(key.replaceAll("-", "/")).getFullYear()
            }
        })

        allTimeGrowth.forEach((g, i) => {
            const prev = allTimeGrowth[i - 1];
            if (!prev) {
                g.percentageGrowth = 0;
                return;
            }
            g.percentageGrowth = ((g.gross / prev.gross - 1) * 100).toFixed(2);
        })

        switch (year) {
            case "all-time":
                allTimeGrowth = allTimeGrowth;
                break;
            case "one-year":
                allTimeGrowth = allTimeGrowth.splice(-12);
                break;
            case "two-years":
                allTimeGrowth = allTimeGrowth.splice(-24);
                break;
            default:
                allTimeGrowth = allTimeGrowth.filter((s) => s.year == year);
                break;
        }


        return { years, allTimeGrowth, currentMonthGross, lastMonthGross, projectedGross: projectedGross + currentMonthGross, vsLastMonth, grossThisTimeLastMonth, specialEventImpact, projectedGrossUpper, vsLastMonthUpper, medianGrowth: medianGrowth * 100 };
    };

    const getDayOfWeekSubscriberDistribution = () => {
        const data = detailedEarningsCSV.subscribersPerDayChart;
        const dayOfWeekDistribution = {};
        data.forEach((subscriber) => {
            const year = subscriber.year;
            const month = subscriber.month;
            const day = subscriber.day;
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            const dayKey = DAYS_OF_WEEK[dayOfWeek];
            if (!dayKey) return;

            const isFirstDayOfMonth = day === 1 || day === 2;
            if (isFirstDayOfMonth) return;
            if (!dayOfWeekDistribution[dayKey]) {
                dayOfWeekDistribution[dayKey] = subscriber.subscribers;
            } else {
                dayOfWeekDistribution[dayKey] += subscriber.subscribers;
            }
        });
        const totalSubscribers = Object.values(dayOfWeekDistribution).reduce((a, b) => a + b, 0);

        const chartData = [];

        DAYS_OF_WEEK.forEach((dayOfWeek) => {
            const dayOfWeekSubscribers = dayOfWeekDistribution[dayOfWeek];
            const percent = (dayOfWeekSubscribers / totalSubscribers) * 100;
            chartData.push({ dayOfWeek, dayOfWeekSubscribers, percent: percent.toFixed(1) });
        });

        return chartData;
    };
    //https://www.patreon.com/dashboard/creator-analytics-detailed-earnings.csv
    return (
        <main className='flex min-h-screen flex-col items-center justify-between p-8'>
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell>
                            <div className='flex items-center flex-col gap-4'>
                                <Label>
                                    {" "}
                                    Upload{" "}
                                    <Link style={{ color: "orange", cursor: "pointer" }} href='https://www.patreon.com/dashboard/creator-analytics-detailed-earnings.csv' target='_blank'>
                                        Detailed Earnings CSV file
                                    </Link>
                                </Label>
                                <Input
                                    type='file'
                                    accept='.csv'
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (e) => {
                                                const csv = e.target.result;
                                                const lines = csv.split("\n");
                                                const headers = lines[0].split(",");
                                                const data = lines.slice(1).map((line) => line.split(","));
                                                const chart = data.map((row) => {
                                                    const dataPoint = {};
                                                    for (let i = 0; i < row.length; i++) {
                                                        dataPoint[headers[i]] = row[i];
                                                    }
                                                    return dataPoint;
                                                });

                                                const currency = chart.find(r => r["Creator currency"])?.["Creator currency"];
                                                if(CURRENCY_MAP[currency]) setCurrency(CURRENCY_MAP[currency]);

                                                const subscribersPerDay = {};
                                                chart.forEach((row) => {
                                                    const date = new Date(row.Date);

                                                    const day = date.getDate();
                                                    const month = date.getMonth();
                                                    const year = date.getFullYear();
                                                    if(Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return;
                                                    const key = `${year}-${month + 1}-${day}`;
                                                    const earnedGross = parseFloat(row["Creator share"] || 0) + parseFloat(row["Creator platform fee"] || 0) + parseFloat(row["Creator payment processing fee"] || 0) + parseFloat(row["Creator currency conversion fee"] || 0);
                                                    if (!subscribersPerDay[key]) {
                                                        subscribersPerDay[key] = { subscribers: 1, day: day, month: month, year: year, date: key, gross: earnedGross };
                                                    } else {
                                                        subscribersPerDay[key].subscribers++;
                                                        subscribersPerDay[key].gross += earnedGross;
                                                    }
                                                });

                                                const uniqueYears = [];

                                                const subscribersPerDayChart = Object.values(subscribersPerDay)
                                                    .map((subscriber) => {
                                                        const year = subscriber.year;
                                                        if(!uniqueYears.includes(year)) uniqueYears.push(year);
                                                        const month = subscriber.month;
                                                        const day = subscriber.day;
                                                        const lastMonthSubscriber = Object.values(subscribersPerDay).find((subscriber) => subscriber.year === year && subscriber.month === month - 1 && subscriber.day === day);
                                                        const lastMonthGross = lastMonthSubscriber ? lastMonthSubscriber.gross : 0;
                                                        const lastMonthSubscribers = lastMonthSubscriber ? lastMonthSubscriber.subscribers : 0;
                                                        const grossDelta = (subscriber.gross - lastMonthGross).toFixed(2);
                                                        const subscribersDelta = subscriber.subscribers - lastMonthSubscribers;
                                                        return { ...subscriber, gross: subscriber.gross.toFixed(2), lastMonthSubscribers, lastMonthGross: lastMonthGross.toFixed(2), grossDelta, subscribersDelta };
                                                    })
                                                    .reverse();
                                                    subscribersPerDayChart.forEach(s => s.date = new Date(s.date.replaceAll("-", "/")).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
                                                if(uniqueYears.length >= 3) setYear("two-years");
                                                else if (uniqueYears.length === 2) setYear("one-year");
                                                else setYear("all-time");
                                                setDetailedEarningsCSV({headers, data, chart, subscribersPerDayChart});
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                />
                            </div>
                        </TableCell>

                        <TableCell>
                            <div className='flex items-center flex-col gap-4'>
                                <Label>Date range</Label>
                                <Select
                                    style={{ width: "100%" }}
                                    value={dateRange}
                                    onValueChange={(value) => {
                                        setDateRange(value);
                                    }}
                                >
                                    <SelectTrigger className='w-[180px]'>
                                        <SelectValue placeholder='Select a date' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='all'>All time</SelectItem>
                                        <SelectItem value='this-month'>This month</SelectItem>
                                        <SelectItem value='last-month'>Last month</SelectItem>
                                        <SelectItem value='last-2-months'>Last 2 months</SelectItem>
                                        <SelectItem value='last-3-months'>Last 3 months</SelectItem>
                                        <SelectItem value='this-year'>This year</SelectItem>
                                        <SelectItem value='last-year'>Last year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TableCell>

                        <TableCell>
                            <div className='flex items-center flex-col gap-4'>
                                <Label>Exclude First Day of Month</Label>
                                <Switch
                                    checked={excludeFirstDayOfMonth}
                                    onCheckedChange={(checked) => {
                                        setExcludeFirstDayOfMonth(checked);
                                    }}
                                />
                            </div>
                        </TableCell>

                        <TableCell>
                            <div className='flex items-center flex-col gap-4'>
                                <Label>Compare Mode</Label>
                                <Switch
                                    checked={compareMode}
                                    onCheckedChange={(checked) => {
                                        setCompareMode(checked);
                                    }}
                                />
                            </div>
                        </TableCell>

                        <TableCell>
                            <div className='flex items-center flex-col gap-4'>
                                <Label>Currency</Label>
                                <Select
                                    value={currency}
                                    onValueChange={(value) => {
                                        setCurrency(value);
                                    }}
                                >
                                    <SelectTrigger className='w-[180px]'>
                                        <SelectValue placeholder='Select a currency' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='€'>€</SelectItem>
                                        <SelectItem value='$'>$</SelectItem>
                                        <SelectItem value='£'>£</SelectItem>
                                        <SelectItem value='¥'>¥</SelectItem>
                                        <SelectItem value='₩'>₩</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            {!!detailedEarningsCSV.subscribersPerDayChart.length && dateRange === "this-month" && (
                <div className='flex flex-row flex-wrap justify-center items-center align-middle w-full gap-5 my-2 mb-4'>
                    <Badge variant='secondary'>
                        Special Event Impact Last Month: {currency}
                        {getMonthlyGrossAndProjected().specialEventImpact.toFixed(0)}
                    </Badge>
                    <Badge variant='secondary'>
                        Today Last Month: {currency}
                        {getMonthlyGrossAndProjected().grossThisTimeLastMonth.toFixed(0)}
                    </Badge>
                    <Badge variant='secondary'>
                        Median Growth:{" "}
                        <span className='ml-1' style={{ color: getMonthlyGrossAndProjected().medianGrowth > 0 ? "lime" : "red" }}>
                            {getMonthlyGrossAndProjected().medianGrowth.toFixed(2)}%
                        </span>
                    </Badge>
                    <Badge>
                        Gross:{" "}
                        <span className='ml-1' style={{ color: getMonthlyGrossAndProjected().grossThisTimeLastMonth < getMonthlyGrossAndProjected().currentMonthGross ? "green" : "red" }}>
                            {currency}
                            {getMonthlyGrossAndProjected().currentMonthGross.toFixed(0)}
                        </span>
                    </Badge>

                    <Badge>
                        Projected Gross: {currency}
                        {getMonthlyGrossAndProjected().projectedGross.toFixed(0)} - {currency}
                        {getMonthlyGrossAndProjected().projectedGrossUpper.toFixed(0)}
                    </Badge>
                    <Badge variant='outline'>
                        VS Last Month:
                        <span className='ml-1' style={{ color: getMonthlyGrossAndProjected().vsLastMonth > 0 ? "lime" : "red" }}>
                            {getMonthlyGrossAndProjected().vsLastMonth.toFixed(2)}%
                        </span>
                        <span className='mx-1'>|</span>
                        <span className='' style={{ color: getMonthlyGrossAndProjected().vsLastMonthUpper > 0 ? "lime" : "red" }}>
                            {getMonthlyGrossAndProjected().vsLastMonthUpper.toFixed(2)}%
                        </span>
                    </Badge>
                </div>
            )}

            {!!detailedEarningsCSV.subscribersPerDayChart.length && (
                <>
                    <LineChart id='subscribersPerDay' width={window.innerWidth * 0.9} height={window.innerHeight * 0.7} data={detailedEarningsCSV.subscribersPerDayChart.filter(dateFilter)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey='date' />
                        <YAxis type='number' domain={
                            [
                                Math.min(
                                    0,
                                    Math.round(
                                        Math.min(...detailedEarningsCSV.subscribersPerDayChart.filter(dateFilter).map((subscriber) => subscriber.gross).concat(compareMode ? detailedEarningsCSV.subscribersPerDayChart.filter(dateFilter).map((subscriber) => subscriber.grossDelta) : [0])) / 100 - 1
                                    ) * 100
                                ),
                                Math.round(
                                    Math.max(...detailedEarningsCSV.subscribersPerDayChart.filter(dateFilter).map((subscriber) => subscriber.gross)) / 100 + 1
                                ) * 100
                            ]
                        } />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(217.2 32.6% 17.5%)" }} />
                        <Legend />
                        <Line type='monotone' dataKey='subscribers' name='Subscribers' key='subscribers' stroke='#0051ff' />
                        {compareMode && <Line type='monotone' dataKey='lastMonthSubscribers' name='Subscribers (prev. Month)' key='lastMonthSubscribers' stroke='#ebba34' />}
                        {compareMode && <Line type='monotone' dataKey='subscribersDelta' name='Subscribers Delta' key='subscribersDelta' stroke='#4d401e' />}
                        <Line type='monotone' dataKey='gross' name='Gross Earnings' key='gross' stroke='#00ff1a' unit={currency} />
                        {compareMode && <Line type='monotone' dataKey='lastMonthGross' name='Gross Earnings (prev. Month)' key='lastMonthGross' stroke='#ff003c' unit={currency} />}
                        {compareMode && <Line type='monotone' dataKey='grossDelta' name='Gross Earnings Delta' key='grossDelta' stroke='#1e4d49' unit={currency} />}
                    </LineChart>

                    <h1 className='scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mt-12'>Day of Week Subscriber Distribution</h1>
                    <BarChart width={window.innerWidth * 0.9} height={window.innerHeight * 0.7} data={getDayOfWeekSubscriberDistribution()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey='dayOfWeek' />
                        <YAxis type='number' unit={"%"} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(217.2 32.6% 17.5%)" }} />
                        <Legend />
                        <Bar dataKey='percent' name='Subscribers' fill='#ff0048' unit={"%"} />
                    </BarChart>

                    <div className='flex flex-row justify-center items-center align-middle w-full gap-5 my-2 mb-4 mt-12'>
                    <h1 className='scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl'>Monthly Gross Over Time</h1>

                    <Select value={year} onValueChange={(value) => {
                        setYear(value);
                    }}>
                        <SelectTrigger className='w-[180px]'>
                            <SelectValue placeholder='Select a Year' />
                        </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-time">All Time</SelectItem>
                                <SelectItem value="one-year">One Year</SelectItem>
                                <SelectItem value="two-years">Two Years</SelectItem>
                            {getMonthlyGrossAndProjected().years.toReversed().map((year) => (
                                <SelectItem value={year} key={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                            
                    </Select>
                    </div>
                    
                    <AreaChart id='allTimeGrowth' width={window.innerWidth * 0.9} height={window.innerHeight * 0.7} data={getMonthlyGrossAndProjected().allTimeGrowth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey='date' />
                        <YAxis type='number' unit={currency} domain={[0, Math.round(Math.max(...getMonthlyGrossAndProjected().allTimeGrowth.map((subscriber) => subscriber.gross)) / 100 + 1) * 100]} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(217.2 32.6% 17.5%)" }} />
                        <Legend />
                        <Area type='monotone' dataKey='gross' name='Gross Earnings' unit={currency} key='gross' stroke='#00ff1a' fill="#00ff1a" fillOpacity={0.3} />
                    </AreaChart>

                    <div className='flex flex-row justify-center items-center align-middle w-full gap-5 my-2 mb-4 mt-12'>
                    <h1 className='scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl'>Month on Month Growth</h1>

                    <Select value={year} onValueChange={(value) => {
                        setYear(value);
                    }}>
                        <SelectTrigger className='w-[180px]'>
                            <SelectValue placeholder='Select a Year' />
                        </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-time">All Time</SelectItem>
                                <SelectItem value="one-year">One Year</SelectItem>
                                <SelectItem value="two-years">Two Years</SelectItem>
                            {getMonthlyGrossAndProjected().years.toReversed().map((year) => (
                                <SelectItem value={year} key={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                            
                    </Select>
                    </div>
                    <BarChart id="allTimeMonthlyGrowth" width={window.innerWidth * 0.9} height={window.innerHeight * 0.7} data={getMonthlyGrossAndProjected().allTimeGrowth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey='date' />
                        <YAxis type='number' unit={"%"} domain={[...getMinMax(getMonthlyGrossAndProjected().allTimeGrowth, "percentageGrowth", 10)]} />
                        <ReferenceLine y={0} stroke="#fff" />
                        <Tooltip contentStyle={{backgroundColor: "hsl(217.2 32.6% 17.5%)"}} />
                        <Legend />
                        <Bar dataKey='percentageGrowth' name='Month on Month Growth' fill='#0095ff' unit={"%"} />
                    </BarChart>
                </>
            )}
            <p className="text-sm text-muted-foreground py-4">All the data uploaded to this page is only stored in memory and not persisted to any database or uploaded to any remote server.</p>
        </main>
    );
}

function getMinMax(arr, key, roundingPad = 100) {
    const min = Math.min(...arr.map((a) => parseFloat(a[key])));
    const max = Math.max(...arr.map((a) => parseFloat(a[key])));
    const minRounded = min - (roundingPad + min % roundingPad);
    const maxRounded = max + (roundingPad - max % roundingPad);
    return [minRounded, maxRounded];
}

const stringToColour = (str) => {
    let hash = 0;
    str.split("").forEach((char) => {
        hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    let colour = "#";
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        colour += value.toString(16).padStart(2, "0");
    }
    return colour;
};

function findMedian(arr) {
    arr = arr.map((v) => parseFloat(v));
    arr.sort((a, b) => a - b);
    const middleIndex = Math.floor(arr.length / 2);

    if (arr.length % 2 === 0) {
        return (arr[middleIndex - 1] + arr[middleIndex]) / 2;
    } else {
        return arr[middleIndex];
    }
}
