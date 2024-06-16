"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useTheme } from "next-themes";

export default function Home() {
    const { setTheme } = useTheme("dark");
    const [insightsCSV, setInsightsCSV] = useState({ headers: [], data: [], chart: [] });
    const [insightsTableHeadersChecked, setInsightsTableHeadersChecked] = useState(["Your total earnings"]);
    const [detailedEarningsCSV, setDetailedEarningsCSV] = useState({ headers: [], data: [], chart: [], subscribersPerDayChart: [] });
    const [dateRange, setDateRange] = useState("all");

    const dateFilter = (subscriber) => {
        const year = subscriber.year;
        const month = subscriber.month;

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
            return year === lastMonth.getFullYear() && (month === lastMonth.getMonth());
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
    //https://www.patreon.com/dashboard/creator-analytics-detailed-earnings.csv
    return (
        <main className='flex min-h-screen flex-col items-center justify-between p-24'>
            <div className='flex items-center space-x-2 flex-col gap-2'>
                <div className='grid grid-cols-2 items-center space-x-2 w-full'>
                    <Label>
                        Upload{" "}
                        <Link style={{ color: "orange", cursor: "pointer" }} href='https://www.patreon.com/dashboard/creator-analytics-earnings.csv' target='_blank'>
                            Insights CSV file
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
                                            if (headers[i] === "Month") {
                                                dataPoint["MonthYear"] = row[i];
                                            } else {
                                                dataPoint[headers[i]] = parseFloat(row[i]);
                                            }
                                        }
                                        const [year, month] = row[0].split("-").map((value) => parseInt(value));
                                        dataPoint.year = year;
                                        dataPoint.month = month - 1;
                                        return dataPoint;
                                    });
                                    setInsightsCSV({ headers, data, chart });
                                };
                                reader.readAsText(file);
                            }
                        }}
                    />
                </div>
                <div className='grid grid-cols-2 items-center space-x-2 w-full'>
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

                                    const subscribersPerDay = {};
                                    chart.forEach((row) => {
                                        const date = new Date(row.Date);

                                        const day = date.getDate();
                                        const month = date.getMonth();
                                        const year = date.getFullYear();
                                        const key = `${year}-${month + 1}-${day}`;
                                        const earnedGross = parseFloat(row["Creator share"] || 0) + parseFloat(row["Creator platform fee"] || 0) + parseFloat(row["Creator payment processing fee"] || 0);
                                        if (!subscribersPerDay[key]) {
                                            subscribersPerDay[key] = { subscribers: 1, day: day, month: month, year: year, date: key, gross: earnedGross };
                                        } else {
                                            subscribersPerDay[key].subscribers++;
                                            subscribersPerDay[key].gross += earnedGross;
                                        }
                                    });
                                    const subscribersPerDayChart = Object.values(subscribersPerDay)
                                        .map((subscriber) => {
                                            return { ...subscriber, gross: subscriber.gross.toFixed(2) };
                                        })
                                        .reverse();
                                    setDetailedEarningsCSV({ headers, data, chart, subscribersPerDayChart });
                                };
                                reader.readAsText(file);
                            }
                        }}
                    />
                </div>

                <div className='grid grid-cols-2 items-center space-x-2 w-full'>
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
            </div>

            {!!detailedEarningsCSV.subscribersPerDayChart.length && (
                <LineChart id='subscribersPerDay' width={window.innerWidth * 0.9} height={window.innerHeight * 0.7} data={detailedEarningsCSV.subscribersPerDayChart.filter(dateFilter)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey='date' />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type='monotone' dataKey='subscribers' key='subscribers' stroke='#8884d8' />
                    <Line type='monotone' dataKey='gross' key='gross' stroke='#82ca9d' />
                </LineChart>
            )}

            {!!insightsCSV.chart.length && (
                <LineChart id='insights' width={window.innerWidth * 0.9} height={window.innerHeight * 0.7} data={insightsCSV.chart.filter(dateFilter)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey='MonthYear' />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {insightsTableHeadersChecked.map((header) => (
                        <Line type='monotone' dataKey={header} key={header} stroke={stringToColour(header)} />
                    ))}
                </LineChart>
            )}

            <Table>
                <TableCaption>Insights</TableCaption>
                <TableHeader>
                    <TableRow>
                        {insightsCSV.headers.map((header) => (
                            <TableHead key={header}>
                                <div className='flex items-center space-x-2'>
                                    <Checkbox
                                        checked={insightsTableHeadersChecked.includes(header)}
                                        onCheckedChange={(checked) => {
                                            const newHeaders = [...insightsTableHeadersChecked];
                                            if (checked) {
                                                newHeaders.push(header);
                                            } else {
                                                newHeaders.splice(newHeaders.indexOf(header), 1);
                                            }
                                            setInsightsTableHeadersChecked(newHeaders);
                                        }}
                                    />

                                    <Label htmlFor={header}>{header}</Label>
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {insightsCSV.data.map((row) => (
                        <TableRow key={row.join()}>
                            {row.map((cell, index) => (
                                <TableCell key={index}>{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </main>
    );
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
