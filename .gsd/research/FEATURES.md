---
title: Role-Based Dashboards and Full HD UI Refactor
version: v2.2
date: 2026-03-06
researcher: Giga Potato
---

# Role-Based Dashboards and Full HD UI Refactor

## Executive Summary

This research focuses on the role-based dashboards and Full HD UI refactor for ErpGreeHouse, a coffee shop CRM + loyalty system. The goal is to create tailored dashboards for three key roles (Operator, Manager, Admin) with optimized layouts for Full HD screens.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Role-Based Dashboard Analysis](#role-based-dashboard-analysis)
  - [Operator Role](#operator-role)
  - [Manager Role](#manager-role)
  - [Admin Role](#admin-role)
- [Full HD UI Optimization](#full-hd-ui-optimization)
- [Feature Categorization](#feature-categorization)
  - [Table Stakes (Must Have)](#table-stakes-must-have)
  - [Differentiators (Competitive Advantage)](#differentiators-competitive-advantage)
  - [Anti-Features (Deliberately Not Built)](#anti-features-deliberately-not-built)
- [Testing and Localization](#testing-and-localization)
- [Conclusion](#conclusion)

## Role-Based Dashboard Analysis

### Operator Role

The Operator role needs a minimal, focused interface for daily operations:

**Key Features:**
- **Client Identification:** Search by phone number or scan QR code
- **Current User Data:** Display customer information (name, loyalty tier, points balance)
- **Linked Transactions:** Show recent purchases and transaction history
- **Accrual/Deduction Actions:** Quick buttons for adding/removing loyalty points
- **Order Processing:** Integration with POS system for current orders
- **Minimal Interface:** Clean design with large buttons for quick access

**Typical Behavior:**
- Fast access to core functions during peak hours
- Limited navigation options to avoid distractions
- Real-time updates for transaction status
- Focus on client interactions rather than analytics

### Manager Role

The Manager role requires analytics and campaign management tools:

**Key Features:**
- **Analytics Dashboard:** Sales trends, customer visit patterns, loyalty program performance
- **Marketing Events:** Create and manage promotions, discounts, and special offers
- **Loyalty Programs:** Configure tiers, points accrual rules, and redemption options
- **CRM Artifacts:** Customer segmentation, feedback management, retention analytics
- **Telegram/VK Integration:** Social media campaign management, messaging tools
- **Campaign Visualization:** Charts and graphs for campaign performance tracking
- **Event Management:** Schedule and monitor marketing events

**Typical Behavior:**
- Analyze data to make strategic decisions
- Plan and execute marketing campaigns
- Monitor loyalty program effectiveness
- Coordinate with staff and external platforms

### Admin Role

The Admin role needs full access with organized, modular components:

**Key Features:**
- **Full System Access:** All features of Operator and Manager roles
- **Modular Collapsible Panels:** Organized sections for different system areas
- **System Configuration:** Settings for POS, CRM, loyalty, and integrations
- **User Management:** Add/remove users, manage roles and permissions
- **Data Management:** Import/export, backup, and data cleaning tools
- **Security Settings:** Access control, audit logs, and compliance features
- **ERP Integration:** Manage ERPNext connection and data synchronization

**Typical Behavior:**
- System configuration and maintenance
- User and role management
- Data oversight and security
- Integration management

## Full HD UI Optimization

**Visual and Layout Improvements:**
- **Responsive Design:** Optimized for Full HD (1920x1080) monitors
- **Typography:** Consistent font sizes and line heights
- **Spacing Tokens:** 8px multiples for consistent spacing
- **Card-Based Layouts:** Clear visual hierarchy with card components
- **Text Alignment:** Fixed alignment issues to prevent floating elements
- **Filtering/Sorting/Search:** For large datasets (products, transactions, domains, GDP tables)
- **Expandable Views:** Limit default table output with expand/collapse functionality

## Feature Categorization

### Table Stakes (Must Have)

**Role-Based Features:**
- Operator dashboard with client identification and transaction management
- Manager dashboard with analytics and campaign management
- Admin dashboard with modular, collapsible panels and full system access

**UI/UX Features:**
- Full HD responsive design
- Consistent typography and spacing
- Card-based layouts with clear hierarchy
- Filters, sorting, and search for large datasets
- Expandable views for tables and widgets
- Fixed text alignment and layout stabilization

**Technical Features:**
- Universal role enum: {OPERATOR, MANAGER, ADMIN}
- Language localization map: {RU, EN, SR}
- Structured UI element identifiers: `role_component_action_language`
- Stable `data-testid` attributes for E2E testing

### Differentiators (Competitive Advantage)

**Unique Features:**
- QR code client identification for quick check-in
- Real-time loyalty point management from Operator dashboard
- Visual campaign performance tracking for Managers
- Modular, collapsible admin interface for complex system management
- Integrated ERPNext connectivity for seamless data synchronization
- Telegram and VK social media campaign management tools

**Design Differentiators:**
- Clean, minimal Operator interface for fast interactions
- Comprehensive analytics with campaign visualization for Managers
- Organized, modular Admin dashboard to avoid information overload

### Anti-Features (Deliberately Not Built)

**Features to Avoid:**
- Complex navigation for Operator role
- Unnecessary data visualization for daily operations
- Overly detailed analytics for Admin role (focus on management)
- Redundant UI elements across roles
- Slow, resource-heavy animations that impact performance
- Non-essential features that complicate the user experience

## Testing and Localization

**Testing Considerations:**
- Role-based E2E tests for each user type
- Responsive tests for Full HD and other screen sizes
- Performance testing for real-time features
- Cross-browser compatibility testing

**Localization:**
- Multi-language support (RU, EN, SR)
- Role-specific terminology translations
- Right-to-left language support if needed

## Conclusion

The role-based dashboards and Full HD UI refactor will significantly improve the user experience for all roles in ErpGreeHouse. Operators will benefit from a minimal, focused interface, Managers will gain powerful analytics and campaign management tools, and Admins will have an organized, modular system for full access. The Full HD optimization ensures the interface looks and functions perfectly on modern displays.
