import { useEffect, useRef } from "react";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

export default function BarChart({ model }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || model.labels.length === 0 || model.datasets.length === 0) {
            return undefined;
        }

        chartInstanceRef.current?.destroy();

        chartInstanceRef.current = new ChartJS(canvasRef.current, {
            type: "bar",
            data: {
                labels: model.labels,
                datasets: model.datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        align: "start",
                        labels: {
                            color: "#c4c8d0",
                        },
                    },
                    tooltip: {
                        intersect: false,
                        mode: "index",
                        backgroundColor: "rgba(10, 10, 12, 0.96)",
                        titleColor: "#edecef",
                        bodyColor: "#c4c8d0",
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        borderWidth: 1,
                    },
                },
                scales: {
                    x: {
                        grid: {
                            color: "rgba(255, 255, 255, 0.04)",
                            drawBorder: false,
                        },
                        ticks: {
                            color: "#8a8f98",
                        },
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(255, 255, 255, 0.08)",
                            drawBorder: false,
                        },
                        ticks: {
                            color: "#8a8f98",
                            precision: 0,
                        },
                    },
                },
            },
        });

        return () => {
            chartInstanceRef.current?.destroy();
            chartInstanceRef.current = null;
        };
    }, [model]);

    if (model.labels.length === 0 || model.datasets.length === 0) {
        return <div className="dashboard-empty-state">No chart data is available for this object.</div>;
    }

    return (
        <div className="dashboard-chart-shell">
            <div className="dashboard-chart-canvas">
                <canvas ref={canvasRef} aria-label={model.title} role="img" />
            </div>
        </div>
    );
}
