"""
Generate interactive Plotly visualizations for SKUNK'D cribbage scoring statistics.

Data source: Exhaustive enumeration of ALL 12,994,800 possible (hand, starter)
combinations by the SKUNK'D scoring engine, validated against rubl.com reference data.

Usage:
    python docs/stats/generate_charts.py

Outputs HTML files to docs/stats/
"""

import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ─── Complete Distribution Data ─────────────────────────────────────────────
# Every value validated against rubl.com exhaustive enumeration
TOTAL = 12_994_800
DISTRIBUTION = {
    0: 1_009_008,
    1: 99_792,
    2: 2_813_796,
    3: 505_008,
    4: 2_855_676,
    5: 697_508,
    6: 1_800_268,
    7: 751_324,
    8: 1_137_236,
    9: 361_224,
    10: 388_740,
    11: 51_680,
    12: 317_340,
    13: 19_656,
    14: 90_100,
    15: 9_168,
    16: 58_248,
    17: 11_196,
    18: 2_708,
    # 19 is impossible
    20: 8_068,
    21: 2_496,
    22: 444,
    23: 356,
    24: 3_680,
    # 25, 26, 27 are impossible
    28: 76,
    29: 4,
}

COMPONENT_AVERAGES = {
    "Fifteens": 2.6061,
    "Pairs": 1.1765,
    "Runs": 0.8700,
    "Flush": 0.0442,
    "Nobs": 0.0724,
}

AVG_SCORE = 4.7692

# ─── Color Palette ──────────────────────────────────────────────────────────
SKUNKD_DARK = "#1a1a2e"
SKUNKD_PURPLE = "#6c3fc5"
SKUNKD_PINK = "#e94560"
SKUNKD_TEAL = "#0f3460"
SKUNKD_GOLD = "#f5a623"
SKUNKD_GREEN = "#27ae60"
SKUNKD_GRAY = "#7f8c8d"
BG_COLOR = "#0d1117"
CARD_BG = "#161b22"
TEXT_COLOR = "#c9d1d9"
GRID_COLOR = "#21262d"


def score_color(score: int) -> str:
    """Color a score bar by its tier."""
    if score == 0:
        return "#6c757d"  # gray — zero/muggins
    elif score <= 4:
        return "#3498db"  # blue — common
    elif score <= 8:
        return "#2ecc71"  # green — decent
    elif score <= 12:
        return "#f39c12"  # amber — good
    elif score <= 16:
        return "#e67e22"  # orange — great
    elif score <= 24:
        return "#e74c3c"  # red — exceptional
    else:
        return "#9b59b6"  # purple — legendary


def base_layout(**overrides) -> dict:
    """Standard dark layout for all charts."""
    layout = dict(
        font=dict(family="'JetBrains Mono', 'Fira Code', monospace", color=TEXT_COLOR),
        paper_bgcolor=BG_COLOR,
        plot_bgcolor=CARD_BG,
        xaxis=dict(gridcolor=GRID_COLOR, zerolinecolor=GRID_COLOR),
        yaxis=dict(gridcolor=GRID_COLOR, zerolinecolor=GRID_COLOR),
        margin=dict(l=70, r=40, t=80, b=70),
    )
    layout.update(overrides)
    return layout


# ═══════════════════════════════════════════════════════════════════════════
# Chart 1: Main Score Distribution
# ═══════════════════════════════════════════════════════════════════════════
def chart_main_distribution():
    scores = list(range(30))
    counts = [DISTRIBUTION.get(s, 0) for s in scores]
    pcts = [c / TOTAL * 100 for c in counts]
    colors = [score_color(s) if counts[s] > 0 else "#2d333b" for s in scores]

    # Build custom hover text
    hover = []
    for s, c, p in zip(scores, counts, pcts):
        if c == 0:
            hover.append(f"Score {s}: IMPOSSIBLE<br>Cannot be achieved in cribbage")
        elif c < 100:
            odds = f"1 in {TOTAL // c:,}"
            hover.append(f"Score {s}<br>{c:,} hands ({p:.4f}%)<br>Odds: {odds}")
        else:
            hover.append(f"Score {s}<br>{c:,} hands ({p:.2f}%)")

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=scores,
            y=pcts,
            marker_color=colors,
            hovertext=hover,
            hoverinfo="text",
            text=[f"{p:.1f}%" if p >= 1.0 else "" for p in pcts],
            textposition="outside",
            textfont=dict(size=10, color=TEXT_COLOR),
        )
    )

    # Annotations for key scores
    annotations = [
        dict(
            x=0,
            y=pcts[0] + 1.5,
            text="<b>'19' Hand</b><br>7.8% score zero",
            showarrow=True,
            arrowhead=2,
            ax=40,
            ay=-40,
            font=dict(size=10, color="#6c757d"),
        ),
        dict(
            x=4,
            y=pcts[4] + 1.5,
            text="<b>Most Common</b><br>22% of all hands",
            showarrow=True,
            arrowhead=2,
            ax=0,
            ay=-45,
            font=dict(size=10, color="#3498db"),
        ),
        dict(
            x=29,
            y=0.8,
            text="<b>Perfect 29</b><br>Only 4 possible<br>1 in 3,248,700",
            showarrow=True,
            arrowhead=2,
            ax=-50,
            ay=-40,
            font=dict(size=10, color="#9b59b6"),
        ),
    ]

    # Mark impossible scores
    for imp in [19, 25, 26, 27]:
        annotations.append(
            dict(
                x=imp,
                y=0.3,
                text="X",
                showarrow=False,
                font=dict(size=14, color="#e74c3c", family="Arial Black"),
            )
        )

    # Average line
    fig.add_vline(x=AVG_SCORE, line=dict(color=SKUNKD_GOLD, width=2, dash="dash"))
    annotations.append(
        dict(
            x=AVG_SCORE,
            y=max(pcts) * 0.85,
            text=f"<b>Average: {AVG_SCORE:.2f}</b>",
            showarrow=False,
            font=dict(size=11, color=SKUNKD_GOLD),
            bgcolor="rgba(0,0,0,0.6)",
            borderpad=4,
        )
    )

    fig.update_layout(
        **base_layout(
            title=dict(
                text="Cribbage Hand Score Distribution<br>"
                "<sub>All 12,994,800 possible hand+starter combinations | Validated against rubl.com</sub>",
                font=dict(size=18),
            ),
            xaxis=dict(
                title="Hand Score",
                dtick=1,
                range=[-0.7, 29.7],
                gridcolor=GRID_COLOR,
                zerolinecolor=GRID_COLOR,
            ),
            yaxis=dict(
                title="Percentage of All Hands (%)",
                gridcolor=GRID_COLOR,
                zerolinecolor=GRID_COLOR,
            ),
            annotations=annotations,
            height=550,
            showlegend=False,
        )
    )

    fig.write_html("docs/stats/score_distribution.html", include_plotlyjs="cdn")
    print("  [1/6] score_distribution.html")


# ═══════════════════════════════════════════════════════════════════════════
# Chart 2: Cumulative "Score X or Better"
# ═══════════════════════════════════════════════════════════════════════════
def chart_cumulative():
    scores = sorted(DISTRIBUTION.keys())
    # Build cumulative from high to low: P(score >= X)
    cum_data = []
    for threshold in range(30):
        count_gte = sum(c for s, c in DISTRIBUTION.items() if s >= threshold)
        cum_data.append((threshold, count_gte / TOTAL * 100))

    x_vals = [d[0] for d in cum_data]
    y_vals = [d[1] for d in cum_data]

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=x_vals,
            y=y_vals,
            mode="lines+markers",
            line=dict(color=SKUNKD_PURPLE, width=3),
            marker=dict(size=6, color=SKUNKD_PURPLE),
            fill="tozeroy",
            fillcolor="rgba(108, 63, 197, 0.15)",
            hovertemplate="Score %{x} or better: %{y:.1f}%<extra></extra>",
        )
    )

    # Key threshold annotations
    milestones = [
        (0, "100%", "Every hand scores\nat least 0"),
        (2, None, "92.2% score 2+"),
        (6, None, "~50% score 6+"),
        (8, None, "~35% score 8+"),
        (12, None, "~5% score 12+"),
        (16, None, "~1% score 16+"),
        (20, None, "0.1% score 20+"),
        (24, None, "0.03% score 24+"),
    ]

    annotations = []
    for score, _, text in milestones:
        pct = sum(c for s, c in DISTRIBUTION.items() if s >= score) / TOTAL * 100
        annotations.append(
            dict(
                x=score,
                y=pct,
                text=f"<b>{pct:.1f}%</b><br>{text}" if text else f"<b>{pct:.1f}%</b>",
                showarrow=True,
                arrowhead=2,
                ax=30 if score < 15 else -40,
                ay=-30,
                font=dict(size=9, color=TEXT_COLOR),
                bgcolor="rgba(0,0,0,0.5)",
                borderpad=3,
            )
        )

    fig.update_layout(
        **base_layout(
            title=dict(
                text="'What Are My Odds?' — Cumulative Score Probability<br>"
                "<sub>Chance of scoring at least X points in any given hand</sub>",
                font=dict(size=18),
            ),
            xaxis=dict(
                title="Minimum Score Threshold",
                dtick=2,
                range=[-0.5, 29.5],
                gridcolor=GRID_COLOR,
                zerolinecolor=GRID_COLOR,
            ),
            yaxis=dict(
                title="Probability (%)",
                range=[0, 105],
                gridcolor=GRID_COLOR,
                zerolinecolor=GRID_COLOR,
            ),
            annotations=annotations,
            height=500,
            showlegend=False,
        )
    )

    fig.write_html("docs/stats/cumulative_probability.html", include_plotlyjs="cdn")
    print("  [2/6] cumulative_probability.html")


# ═══════════════════════════════════════════════════════════════════════════
# Chart 3: Score Tier Breakdown (Donut)
# ═══════════════════════════════════════════════════════════════════════════
def chart_tiers():
    tiers = {
        "Zero ('19')": (0, 0),
        "Low (1-4)": (1, 4),
        "Medium (5-8)": (5, 8),
        "Good (9-12)": (9, 12),
        "Great (13-16)": (13, 16),
        "Exceptional (17-24)": (17, 24),
        "Legendary (28-29)": (28, 29),
    }

    labels, values, tier_colors = [], [], []
    color_map = [
        "#6c757d",
        "#3498db",
        "#2ecc71",
        "#f39c12",
        "#e67e22",
        "#e74c3c",
        "#9b59b6",
    ]

    for i, (label, (lo, hi)) in enumerate(tiers.items()):
        count = sum(c for s, c in DISTRIBUTION.items() if lo <= s <= hi)
        labels.append(label)
        values.append(count)
        tier_colors.append(color_map[i])

    # Common-sense comparisons for hover
    comparisons = [
        "About 1 in 13 hands",
        "Nearly half of all hands (48%)",
        "About 1 in 3 hands",
        "About 1 in 11 hands",
        "About 1 in 73 hands",
        "About 1 in 480 hands",
        "Only 80 hands out of 13 million",
    ]

    hover_text = [
        f"<b>{l}</b><br>{v:,} hands ({v / TOTAL * 100:.2f}%)<br>{c}"
        for l, v, c in zip(labels, values, comparisons)
    ]

    fig = go.Figure()

    fig.add_trace(
        go.Pie(
            labels=labels,
            values=values,
            hole=0.45,
            marker=dict(colors=tier_colors, line=dict(color=BG_COLOR, width=2)),
            textinfo="label+percent",
            textposition="outside",
            textfont=dict(size=11),
            hovertext=hover_text,
            hoverinfo="text",
            sort=False,
        )
    )

    fig.update_layout(
        **base_layout(
            title=dict(
                text="Hand Quality Tiers<br>"
                "<sub>How often does each caliber of hand show up?</sub>",
                font=dict(size=18),
            ),
            height=550,
            annotations=[
                dict(
                    text=f"<b>Avg<br>{AVG_SCORE:.1f}</b>",
                    x=0.5,
                    y=0.5,
                    font=dict(size=20, color=TEXT_COLOR),
                    showarrow=False,
                )
            ],
            showlegend=False,
        )
    )

    fig.write_html("docs/stats/score_tiers.html", include_plotlyjs="cdn")
    print("  [3/6] score_tiers.html")


# ═══════════════════════════════════════════════════════════════════════════
# Chart 4: Rarity Scale — Log Comparison
# ═══════════════════════════════════════════════════════════════════════════
def chart_rarity():
    rare_hands = [
        ("Score 29 (perfect)", 4, "#9b59b6"),
        ("Score 28", 76, "#9b59b6"),
        ("Score 24", 3_680, "#e74c3c"),
        ("Score 23", 356, "#e74c3c"),
        ("Score 22", 444, "#e74c3c"),
        ("Score 21", 2_496, "#e67e22"),
        ("Score 20", 8_068, "#e67e22"),
        ("Score 17+", sum(c for s, c in DISTRIBUTION.items() if s >= 17), "#f39c12"),
    ]

    # Real-world comparisons
    real_world = [
        ("Poker: Royal Flush", 649_740, "#2ecc71"),  # 1 in 649,740
        ("Struck by lightning\n(per year)", 1_222_000, "#3498db"),  # ~1 in 1.2M
        ("Hole in one\n(amateur)", 12_500, "#2ecc71"),  # 1 in 12,500
        ("Four-leaf clover\n(per clover)", 5_000, "#27ae60"),  # ~1 in 5,000
    ]

    labels, odds, colors = [], [], []

    for name, count, color in rare_hands:
        one_in = TOTAL / count if count > 0 else float("inf")
        labels.append(name)
        odds.append(one_in)
        colors.append(color)

    for name, one_in, color in real_world:
        labels.append(name)
        odds.append(one_in)
        colors.append(color)

    # Sort by rarity (most rare first)
    combined = sorted(zip(labels, odds, colors), key=lambda x: -x[1])
    labels = [c[0] for c in combined]
    odds = [c[1] for c in combined]
    colors = [c[2] for c in combined]

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            y=labels,
            x=odds,
            orientation="h",
            marker_color=colors,
            text=[f"1 in {int(o):,}" for o in odds],
            textposition="outside",
            textfont=dict(size=10, color=TEXT_COLOR),
            hovertemplate="%{y}: 1 in %{x:,.0f}<extra></extra>",
        )
    )

    fig.update_layout(
        **base_layout(
            title=dict(
                text="How Rare Is That Hand? — Cribbage vs Real Life<br>"
                "<sub>Logarithmic scale | Cribbage hands in purple/red, real-world events in green/blue</sub>",
                font=dict(size=18),
            ),
            xaxis=dict(
                title="Odds (1 in X)",
                type="log",
                gridcolor=GRID_COLOR,
                zerolinecolor=GRID_COLOR,
            ),
            yaxis=dict(
                gridcolor=GRID_COLOR,
                zerolinecolor=GRID_COLOR,
                autorange="reversed",
            ),
            height=500,
            showlegend=False,
            margin=dict(l=160, r=100, t=80, b=60),
        )
    )

    fig.write_html("docs/stats/rarity_scale.html", include_plotlyjs="cdn")
    print("  [4/6] rarity_scale.html")


# ═══════════════════════════════════════════════════════════════════════════
# Chart 5: Where Do Points Come From? (Component Breakdown)
# ═══════════════════════════════════════════════════════════════════════════
def chart_components():
    components = list(COMPONENT_AVERAGES.keys())
    values = list(COMPONENT_AVERAGES.values())
    colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"]
    pcts = [v / AVG_SCORE * 100 for v in values]

    descriptions = [
        "Card combos summing to 15 (2pts each)",
        "Matching ranks (2pts per pair)",
        "3+ consecutive ranks",
        "4-5 cards of same suit",
        "Jack in hand matching starter suit",
    ]

    hover = [
        f"<b>{c}</b><br>Average: {v:.4f} pts/hand ({p:.1f}%)<br>{d}"
        for c, v, p, d in zip(components, values, pcts, descriptions)
    ]

    fig = make_subplots(
        rows=1,
        cols=2,
        specs=[[{"type": "bar"}, {"type": "pie"}]],
        subplot_titles=("Average Points per Hand", "Share of Total Score"),
        column_widths=[0.55, 0.45],
    )

    fig.add_trace(
        go.Bar(
            x=components,
            y=values,
            marker_color=colors,
            text=[f"{v:.2f}" for v in values],
            textposition="outside",
            textfont=dict(size=12, color=TEXT_COLOR),
            hovertext=hover,
            hoverinfo="text",
            showlegend=False,
        ),
        row=1,
        col=1,
    )

    fig.add_trace(
        go.Pie(
            labels=components,
            values=values,
            marker=dict(colors=colors, line=dict(color=BG_COLOR, width=2)),
            textinfo="label+percent",
            textfont=dict(size=10),
            hovertext=hover,
            hoverinfo="text",
            hole=0.3,
        ),
        row=1,
        col=2,
    )

    fig.update_layout(
        **base_layout(
            title=dict(
                text="Where Do Cribbage Points Come From?<br>"
                f"<sub>Breakdown of the average {AVG_SCORE:.2f}-point hand across all 12.99M combinations</sub>",
                font=dict(size=18),
            ),
            height=450,
            showlegend=False,
        )
    )

    # Style subplot title colors
    for ann in fig.layout.annotations:
        ann.font = dict(size=13, color=TEXT_COLOR)

    fig.write_html("docs/stats/score_components.html", include_plotlyjs="cdn")
    print("  [5/6] score_components.html")


# ═══════════════════════════════════════════════════════════════════════════
# Chart 6: Even vs Odd — The Cribbage Quirk
# ═══════════════════════════════════════════════════════════════════════════
def chart_even_odd():
    even_count = sum(c for s, c in DISTRIBUTION.items() if s % 2 == 0)
    odd_count = sum(c for s, c in DISTRIBUTION.items() if s % 2 != 0)

    even_scores = sorted([s for s in DISTRIBUTION if s % 2 == 0])
    odd_scores = sorted([s for s in DISTRIBUTION if s % 2 != 0])

    fig = make_subplots(
        rows=1,
        cols=2,
        specs=[[{"type": "pie"}, {"type": "bar"}]],
        subplot_titles=("Even vs Odd Split", "Score-by-Score Comparison"),
        column_widths=[0.35, 0.65],
    )

    # Pie chart
    fig.add_trace(
        go.Pie(
            labels=["Even Scores", "Odd Scores"],
            values=[even_count, odd_count],
            marker=dict(
                colors=["#3498db", "#e74c3c"], line=dict(color=BG_COLOR, width=2)
            ),
            textinfo="label+percent",
            textfont=dict(size=12),
            hole=0.4,
            hovertemplate="%{label}: %{value:,} hands (%{percent})<extra></extra>",
        ),
        row=1,
        col=1,
    )

    # Grouped bar chart
    all_scores = list(range(30))
    even_vals = [
        DISTRIBUTION.get(s, 0) / TOTAL * 100 if s % 2 == 0 else 0 for s in all_scores
    ]
    odd_vals = [
        DISTRIBUTION.get(s, 0) / TOTAL * 100 if s % 2 != 0 else 0 for s in all_scores
    ]

    fig.add_trace(
        go.Bar(
            x=all_scores,
            y=even_vals,
            name="Even",
            marker_color="#3498db",
            opacity=0.85,
            hovertemplate="Score %{x}: %{y:.2f}%<extra>Even</extra>",
        ),
        row=1,
        col=2,
    )

    fig.add_trace(
        go.Bar(
            x=all_scores,
            y=odd_vals,
            name="Odd",
            marker_color="#e74c3c",
            opacity=0.85,
            hovertemplate="Score %{x}: %{y:.2f}%<extra>Odd</extra>",
        ),
        row=1,
        col=2,
    )

    fig.update_layout(
        **base_layout(
            title=dict(
                text="The Even-Score Advantage<br>"
                "<sub>Cribbage heavily favors even scores — fifteens (2pts) and pairs (2pts) are the dominant scoring mechanisms</sub>",
                font=dict(size=18),
            ),
            xaxis2=dict(
                title="Score", dtick=2, gridcolor=GRID_COLOR, zerolinecolor=GRID_COLOR
            ),
            yaxis2=dict(
                title="% of Hands", gridcolor=GRID_COLOR, zerolinecolor=GRID_COLOR
            ),
            height=450,
            barmode="overlay",
            legend=dict(x=0.85, y=0.95, bgcolor="rgba(0,0,0,0.5)"),
        )
    )

    for ann in fig.layout.annotations:
        ann.font = dict(size=13, color=TEXT_COLOR)

    fig.write_html("docs/stats/even_odd.html", include_plotlyjs="cdn")
    print("  [6/6] even_odd.html")


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\nGenerating SKUNK'D scoring statistics charts...")
    print(f"  Data: {TOTAL:,} hand+starter combinations\n")

    chart_main_distribution()
    chart_cumulative()
    chart_tiers()
    chart_rarity()
    chart_components()
    chart_even_odd()

    print("\nAll charts saved to docs/stats/")
    print("Open any .html file in a browser for interactive exploration.\n")
