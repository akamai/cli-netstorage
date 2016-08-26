let Luna = require('./luna'),
    util = require('util');

let APIClient = function(config = {path:"~/.edgerc", section: "luna"}, username, password) {
    this._luna = new Luna(config, username, password);
};

APIClient.SERVICE_PROVIDER = {
    LUNA: "Luna APIs",
    CSI: "CSI",
    IM: "Image Manager",
    CCU: "CCU APIs",
    GTM: "dns"
};


/**
 * Step 1: We need the groupID associated with the contract. This is a nebulous issue because we need the groups, and there
 * is a groupID API, except that we can't call this api beacuse we haven't yet created a valid API credentials. Therefore
 * we have to hack our way to extract the groupID and then move on to creating the API credentials. This is very crude
 * mechanism because it doesn't take into account indirect users or multiple contracts.
 *
 * GET /ui/services/nav/megamenu/currentUser/grp.json
 *      {"context":null,"users":{"textLoggedInAs":null,"mainMenuItems":[{"cps":null,"name":"Settings","subMenuItems":[{"cps":null,"name":"Profile","subMenuItems":null,"dps":null,"url":"/portal/profile/edit_profile.jsf","itemId":0,"contextId":0},{"cps":null,"name":"Logout","subMenuItems":null,"dps":null,"url":"/portal/logout.jsp","itemId":0,"contextId":0}],"dps":null,"url":"/portal/profile/edit_profile.jsf","itemId":0,"contextId":0}],"impersonator":null,"current":"Advocate2 Akamai"},"accounts":null,"contextTitle":"Select Group or Property","currentAccount":"Akamai DevRel & Advocates","hasAccounts":null,"tabs":[{"tabId":1,"active":false,"name":"MONITOR","englishName":"MONITOR","url":null,"columns":[{"id":1,"mainMenuItems":[{"cps":null,"name":"Ion","subMenuItems":[{"cps":null,"name":"User Traffic","subMenuItems":null,"dps":null,"url":"/core-reports/views/user_traffic.do?tab=MONITOR&type=context&gid=64867","itemId":22364,"contextId":0},{"cps":null,"name":"User Performance","subMenuItems":null,"dps":null,"url":"/core-reports/views/sureroute_performance.do?tab=MONITOR&type=context&gid=64867","itemId":22366,"contextId":0},{"cps":null,"name":"Unique Visitors","subMenuItems":null,"dps":null,"url":"/core-reports/views/unique_visitors.do?tab=MONITOR&type=context&gid=64867","itemId":22368,"contextId":0},{"cps":null,"name":"Offload","subMenuItems":null,"dps":null,"url":"/core-reports/views/offload.do?tab=MONITOR&type=context&gid=64867","itemId":22370,"contextId":0},{"cps":null,"name":"Responses","subMenuItems":null,"dps":null,"url":"/core-reports/views/responses.do?tab=MONITOR&type=context&gid=64867","itemId":22372,"contextId":0},{"cps":null,"name":"SaaS Traffic","subMenuItems":null,"dps":null,"url":"/core-reports/views/saas_user_traffic.do?tab=MONITOR&type=context&gid=64867","itemId":22374,"contextId":0},{"cps":null,"name":"SaaS Responses","subMenuItems":null,"dps":null,"url":"/core-reports/views/saas_responses.do?tab=MONITOR&type=context&gid=64867","itemId":22376,"contextId":0},{"cps":null,"name":"SaaS Registration Details","subMenuItems":null,"dps":null,"url":"/sr/servlet/ListDetails?tab=MONITOR&type=context&gid=64867","itemId":22378,"contextId":0},{"cps":null,"name":"SaaS Registration Details (Beta)","subMenuItems":null,"dps":null,"url":"/apps/sr/#/ViewSrList/ion?tab=MONITOR&type=context&gid=64867","itemId":22380,"contextId":0},{"cps":null,"name":"SaaS User Counts","subMenuItems":null,"dps":null,"url":"/core-reports/views/saas_users.do?tab=MONITOR&type=context&gid=64867","itemId":22382,"contextId":0},{"cps":null,"name":"SNI Readiness","subMenuItems":null,"dps":null,"url":"/core-reports/views/sni_readiness.do?tab=MONITOR&type=context&gid=64867","itemId":22384,"contextId":0},{"cps":null,"name":"Front-End Optimization","subMenuItems":null,"dps":null,"url":"/core-reports/views/feo/effectiveness.do?tab=MONITOR&type=context&gid=64867","itemId":22386,"contextId":0},{"cps":null,"name":"Adaptive Image Compression","subMenuItems":null,"dps":null,"url":"/mobile-reporting/views/mobile.do?tab=MONITOR&type=context&gid=64867","itemId":22389,"contextId":0},{"cps":null,"name":"Prefetching","subMenuItems":null,"dps":null,"url":"/core-reports/views/pre_fetching.do?tab=MONITOR&type=context&gid=64867","itemId":22391,"contextId":0},{"cps":null,"name":"Origin Performance","subMenuItems":null,"dps":null,"url":"/core-reports/views/origin_performance.do?tab=MONITOR&type=context&gid=64867","itemId":22393,"contextId":0}],"dps":null,"url":null,"itemId":22182,"contextId":0},{"cps":null,"name":"Cloudlets","subMenuItems":[{"cps":null,"name":"Cloudlets Usage","subMenuItems":null,"dps":null,"url":"/core-reports/views/cloudlets.do?tab=MONITOR&type=context&gid=64867","itemId":22395,"contextId":0},{"cps":null,"name":"Image Converter","subMenuItems":null,"dps":null,"url":"/core-reports/views/image_converter.do?tab=MONITOR&type=context&gid=64867","itemId":22397,"contextId":0}],"dps":null,"url":null,"itemId":22184,"contextId":0},{"cps":null,"name":"Site","subMenuItems":[{"cps":null,"name":"User Traffic","subMenuItems":null,"dps":null,"url":"/core-reports/views/user_traffic.do?tab=MONITOR&type=context&gid=64867","itemId":22402,"contextId":0},{"cps":null,"name":"Unique Visitors","subMenuItems":null,"dps":null,"url":"/core-reports/views/unique_visitors.do?tab=MONITOR&type=context&gid=64867","itemId":22406,"contextId":0},{"cps":null,"name":"Offload","subMenuItems":null,"dps":null,"url":"/core-reports/views/offload.do?tab=MONITOR&type=context&gid=64867","itemId":22408,"contextId":0},{"cps":null,"name":"Responses","subMenuItems":null,"dps":null,"url":"/core-reports/views/responses.do?tab=MONITOR&type=context&gid=64867","itemId":22410,"contextId":0},{"cps":null,"name":"Traffic","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=sitetraffic&tab=MONITOR&type=context&gid=64867","itemId":22418,"contextId":0},{"cps":null,"name":"Visitors","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=sitevisitors&tab=MONITOR&type=context&gid=64867","itemId":22419,"contextId":0},{"cps":null,"name":"URLs","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=siteurls&tab=MONITOR&type=context&gid=64867","itemId":22420,"contextId":0}],"dps":null,"url":null,"itemId":22189,"contextId":0}]},{"id":2,"mainMenuItems":[{"cps":null,"name":"Media Reports","subMenuItems":[],"dps":null,"url":"/media-app/mediareports.do?tab=MONITOR&type=context&gid=64867","itemId":22229,"contextId":0},{"cps":null,"name":"Live Media","subMenuItems":[{"cps":null,"name":"Monitor  Streams","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=lmms&tab=MONITOR&type=context&gid=64867","itemId":22647,"contextId":0}],"dps":null,"url":null,"itemId":22239,"contextId":0},{"cps":null,"name":"Download Delivery","subMenuItems":[{"cps":null,"name":"Traffic","subMenuItems":null,"dps":null,"url":"/download-reports/views/dd/traffic.do?sidebar=DD_trafficnew&tab=MONITOR&type=context&gid=64867","itemId":22685,"contextId":0},{"cps":null,"name":"Visitors","subMenuItems":null,"dps":null,"url":"/download-reports/views/dd/visitors.do?sidebar=DD_visitorsnew&tab=MONITOR&type=context&gid=64867","itemId":22687,"contextId":0},{"cps":null,"name":"URLs","subMenuItems":null,"dps":null,"url":"/download-reports/views/dd/urls.do?sidebar=DD_urlsnew&tab=MONITOR&type=context&gid=64867","itemId":22689,"contextId":0}],"dps":null,"url":null,"itemId":22242,"contextId":0},{"cps":null,"name":"Adaptive Media Delivery","subMenuItems":[{"cps":null,"name":"Summary","subMenuItems":null,"dps":null,"url":"/media-reports/views/summary.do?sidebar=AMD_amd_summary&tab=MONITOR&type=context&gid=64867","itemId":22691,"contextId":0},{"cps":null,"name":"Traffic","subMenuItems":null,"dps":null,"url":"/media-reports/views/traffic.do?sidebar=AMD_amd_traffic&tab=MONITOR&type=context&gid=64867","itemId":22693,"contextId":0},{"cps":null,"name":"Responses","subMenuItems":null,"dps":null,"url":"/media-reports/views/responses.do?sidebar=AMD_amd_responses&tab=MONITOR&type=context&gid=64867","itemId":22695,"contextId":0},{"cps":null,"name":"Visitors","subMenuItems":null,"dps":null,"url":"/media-reports/views/visitors.do?sidebar=AMD_amd_visitors&tab=MONITOR&type=context&gid=64867","itemId":22697,"contextId":0},{"cps":null,"name":"URLs","subMenuItems":null,"dps":null,"url":"/media-reports/views/urls.do?sidebar=AMD_amd_urls&tab=MONITOR&type=context&gid=64867","itemId":22699,"contextId":0}],"dps":null,"url":null,"itemId":22244,"contextId":0}]},{"id":3,"mainMenuItems":[{"cps":null,"name":"Security","subMenuItems":[{"cps":null,"name":"Security Center","subMenuItems":null,"dps":null,"url":"/konadashboard/?tab=MONITOR&type=context&gid=64867","itemId":22309,"contextId":0},{"cps":null,"name":"Security Monitor","subMenuItems":null,"dps":null,"url":"/qos/SecMonServlet?action=fromMegaMenu&tab=MONITOR&type=context&gid=64867","itemId":22313,"contextId":0},{"cps":null,"name":"WAF Activity","subMenuItems":null,"dps":null,"url":"/core-reports/views/security/firewall_activity.do?tab=MONITOR&type=context&gid=64867","itemId":22314,"contextId":0},{"cps":null,"name":"WAF Rate Control","subMenuItems":null,"dps":null,"url":"/core-reports/views/security/rate_activity.do?tab=MONITOR&type=context&gid=64867","itemId":22316,"contextId":0},{"cps":null,"name":"Client Reputation Details","subMenuItems":null,"dps":null,"url":"/reputationConsole/main?tab=MONITOR&type=context&gid=64867","itemId":22320,"contextId":0},{"cps":null,"name":"Reputation Activity","subMenuItems":null,"dps":null,"url":"/core-reports/views/security/reputation_activity.do?tab=MONITOR&type=context&gid=64867","itemId":22322,"contextId":0},{"cps":null,"name":"SARA","subMenuItems":null,"dps":null,"url":"/sara/?tab=MONITOR&type=context&gid=64867","itemId":22324,"contextId":0},{"cps":null,"name":"Prolexic Portal","subMenuItems":null,"dps":null,"url":"/waf/pages/prolexic?tab=MONITOR&type=context&gid=64867","itemId":22328,"contextId":0}],"dps":null,"url":null,"itemId":22176,"contextId":0},{"cps":null,"name":"Fast DNS","subMenuItems":[{"cps":null,"name":"Traffic","subMenuItems":null,"dps":null,"url":"/gtmdb/edns_main.action?sidebar=FastDNS_traffic&tab=MONITOR&type=context&gid=64867","itemId":22578,"contextId":0},{"cps":null,"name":"DNS Monitor","subMenuItems":null,"dps":null,"url":"/qos/EdnsServlet?action=fromMegaMenu&tab=MONITOR&type=context&gid=64867","itemId":22579,"contextId":0}],"dps":null,"url":null,"itemId":22219,"contextId":0},{"cps":null,"name":"NetStorage","subMenuItems":[{"cps":null,"name":"Volume","subMenuItems":null,"dps":null,"url":"/ns-reports/acs_usage_report.action?tab=MONITOR&type=context&gid=64867","itemId":22736,"contextId":0},{"cps":null,"name":"Security Report","subMenuItems":null,"dps":null,"url":"/download-reports/views/ns/security/summarybyuser.do?tab=MONITOR&type=context&gid=64867","itemId":22738,"contextId":0},{"cps":null,"name":"Recent Activity","subMenuItems":null,"dps":null,"url":"/ns-reports/acs_activity_report.action?tab=MONITOR&type=context&gid=64867","itemId":22741,"contextId":0}],"dps":null,"url":null,"itemId":22254,"contextId":0},{"cps":null,"name":"Traffic Management","subMenuItems":[{"cps":null,"name":"Traffic Status","subMenuItems":null,"dps":null,"url":"/gtmdb/gtm_domain_traffic_main.action?tab=MONITOR&type=context&gid=64867","itemId":22771,"contextId":0},{"cps":null,"name":"Load Feedback","subMenuItems":null,"dps":null,"url":"/gtmdb/gtm_loadfeedback_main.action?tab=MONITOR&type=context&gid=64867","itemId":22772,"contextId":0},{"cps":null,"name":"Errors","subMenuItems":null,"dps":null,"url":"/gtmdb/gtm_errors_main.action?tab=MONITOR&type=context&gid=64867","itemId":22773,"contextId":0}],"dps":null,"url":null,"itemId":22286,"contextId":0}]},{"id":4,"mainMenuItems":[{"cps":null,"name":"Media Analytics","subMenuItems":[],"dps":null,"url":"/qos/ConsoleServlet?action=fromMegaMenu&tab=MONITOR&type=context&gid=64867","itemId":22208,"contextId":0},{"cps":null,"name":"Download Analytics","subMenuItems":[],"dps":null,"url":"/dla/DLADashBoardServlet?tab=MONITOR&type=context&gid=64867","itemId":22214,"contextId":0},{"cps":null,"name":"Performance Analytics","subMenuItems":[{"cps":null,"name":"Site Analyzer Report","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/views/reports.do?sidebar=PERF_analyzer_report&tab=MONITOR&type=context&gid=64867","itemId":22747,"contextId":0},{"cps":null,"name":"Instant Check","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/siteAnalyzer/SiteCheckServlet?sidebar=PERF_analyzer_icheck&tab=MONITOR&type=context&gid=64867","itemId":22752,"contextId":0},{"cps":null,"name":"Site Analyzer Recurring Reports","subMenuItems":null,"dps":null,"url":"/erra/report_list.action?sidebar=PERF_analyzer_recurring&tab=MONITOR&type=context&gid=64867","itemId":22755,"contextId":0}],"dps":null,"url":null,"itemId":22259,"contextId":0},{"cps":null,"name":"SLA Management","subMenuItems":[{"cps":null,"name":"Reports","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=slarpt&tab=MONITOR&type=context&gid=64867","itemId":22757,"contextId":0},{"cps":null,"name":"Diagnosis","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=sladiag&tab=MONITOR&type=context&gid=64867","itemId":22759,"contextId":0}],"dps":null,"url":null,"itemId":22268,"contextId":0},{"cps":null,"name":"DNS SLA Management","subMenuItems":[{"cps":null,"name":"EDNS Report","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/views/sla/edns/report.do?tab=MONITOR&type=context&gid=64867","itemId":22764,"contextId":0},{"cps":null,"name":"GTM Report","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/views/sla/gtm/report.do?tab=MONITOR&type=context&gid=64867","itemId":22765,"contextId":0},{"cps":null,"name":"EDNS Diagnose","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/views/sla/edns/diagnose.do?tab=MONITOR&type=context&gid=64867","itemId":22766,"contextId":0},{"cps":null,"name":"GTM Diagnose","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/views/sla/gtm/diagnose.do?tab=MONITOR&type=context&gid=64867","itemId":22767,"contextId":0}],"dps":null,"url":null,"itemId":22270,"contextId":0},{"cps":null,"name":"Real User Monitoring","subMenuItems":[],"dps":null,"url":"/core/productselector/selectproduct?module=rumrpt&tab=MONITOR&type=context&gid=64867","itemId":22273,"contextId":0},{"cps":null,"name":"EdgeConnect (Legacy)","subMenuItems":[],"dps":null,"url":"/dlr/report/logline.do?tab=MONITOR&type=context&gid=64867","itemId":22274,"contextId":0},{"cps":null,"name":"EdgeConnect","subMenuItems":[],"dps":null,"url":"/core-reports/views/dlr_reports.do?tab=MONITOR&type=context&gid=64867","itemId":22275,"contextId":0},{"cps":null,"name":"Recurring Reports","subMenuItems":[],"dps":null,"url":"/core/productselector/selectproduct?module=erra&tab=MONITOR&type=context&gid=64867","itemId":22276,"contextId":0},{"cps":null,"name":"Billing Center","subMenuItems":[],"dps":null,"url":"/apps/billing-center?tab=MONITOR&type=context&gid=64867","itemId":22277,"contextId":0},{"cps":null,"name":"Akamai Spinning Globe","subMenuItems":[],"dps":null,"url":"/partner-tools/globe_download.action?sidebar=ADMIN_globe&tab=MONITOR&type=context&gid=64867","itemId":22278,"contextId":0},{"cps":null,"name":"Adaptive Alerting","subMenuItems":[],"dps":null,"url":"/tranquility/home?tab=MONITOR&type=context&gid=64867","itemId":22279,"contextId":0}]}],"itemId":1},{"tabId":2,"active":false,"name":"CONFIGURE","englishName":"CONFIGURE","url":null,"columns":[{"id":1,"mainMenuItems":[{"cps":null,"name":"Property","subMenuItems":[{"cps":null,"name":"Site","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=addsiteprpty&tab=CONFIGURE&type=context&gid=64867","itemId":22292,"contextId":0}],"dps":null,"url":null,"itemId":22161,"contextId":0},{"cps":null,"name":"Property Manager","subMenuItems":[{"cps":null,"name":"New Property","subMenuItems":null,"dps":null,"url":"/platformtoolkit/web/main/create_property?tab=CONFIGURE&type=context&gid=64867","itemId":22297,"contextId":0},{"cps":null,"name":"Push to Test Ghost","subMenuItems":null,"dps":null,"url":"/apps/etn-ui/?tab=CONFIGURE&type=context&gid=64867","itemId":22298,"contextId":0}],"dps":null,"url":null,"itemId":22162,"contextId":0},{"cps":null,"name":"Media Services On Demand","subMenuItems":[{"cps":null,"name":"Content Preparation","subMenuItems":null,"dps":null,"url":"/media-workflow/init/configure?tab=CONFIGURE&type=context&gid=64867","itemId":22301,"contextId":0}],"dps":null,"url":null,"itemId":22163,"contextId":0},{"cps":null,"name":"Media Services Live","subMenuItems":[],"dps":null,"url":"/streaming/LiveMedia?tab=CONFIGURE&type=context&gid=64867","itemId":22164,"contextId":0},{"cps":null,"name":"Advanced Configuration","subMenuItems":[],"dps":null,"url":"/cmportal/ap/arl/view_arl.jsp?tab=CONFIGURE&type=context&gid=64867","itemId":22170,"contextId":0},{"cps":null,"name":"SSL Certificate Management","subMenuItems":[],"dps":null,"url":"/cps/subscriptions.tiles?tab=CONFIGURE&type=context&gid=64867","itemId":22175,"contextId":0},{"cps":null,"name":"Cloudlets","subMenuItems":[{"cps":null,"name":"Cloudlets Policy Manager","subMenuItems":null,"dps":null,"url":"/apps/cloudlets/#/policies?tab=CONFIGURE&type=context&gid=64867","itemId":22399,"contextId":0}],"dps":null,"url":null,"itemId":22185,"contextId":0},{"cps":null,"name":"Image Manager","subMenuItems":[{"cps":null,"name":"Policy Manager","subMenuItems":null,"dps":null,"url":"/apps/image-manager-policies/#/landing?tab=CONFIGURE&type=context&gid=64867","itemId":22401,"contextId":0}],"dps":null,"url":null,"itemId":22188,"contextId":0}]},{"id":3,"mainMenuItems":[{"cps":null,"name":"Security","subMenuItems":[{"cps":null,"name":"Firewall Rules Notification","subMenuItems":null,"dps":null,"url":"/portal/iphd/iphd_ip.jsp?tab=CONFIGURE&type=context&gid=64867","itemId":22330,"contextId":0},{"cps":null,"name":"Site Shield Management","subMenuItems":null,"dps":null,"url":"/siteshield/maps?tab=CONFIGURE&type=context&gid=64867","itemId":22337,"contextId":0},{"cps":null,"name":"SecureHD Policy Editor","subMenuItems":null,"dps":null,"url":"/hd-provision/manage_policies.action?sidebar=SPE_hdspm&tab=CONFIGURE&type=context&gid=64867","itemId":22338,"contextId":0},{"cps":null,"name":"Security Configuration (WAF Configuration)","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=pciconfig&tab=CONFIGURE&type=context&gid=64867","itemId":22341,"contextId":0},{"cps":null,"name":"Prolexic Routed","subMenuItems":null,"dps":null,"url":"/routed/?tab=CONFIGURE&type=context&gid=64867","itemId":22344,"contextId":0},{"cps":null,"name":"Network List Management","subMenuItems":null,"dps":null,"url":"/pci/waf_named_lists.action?tab=CONFIGURE&type=context&gid=64867","itemId":22348,"contextId":0}],"dps":null,"url":null,"itemId":22177,"contextId":0},{"cps":null,"name":"CPCode Management","subMenuItems":[{"cps":null,"name":"Manage CP Codes","subMenuItems":null,"dps":null,"url":"/portal/cpcode/cpcodes_view.jsp?sidebar=ADMIN_cpcode&tab=CONFIGURE&type=context&gid=64867","itemId":22565,"contextId":0}],"dps":null,"url":null,"itemId":22200,"contextId":0},{"cps":null,"name":"EdgeScape","subMenuItems":[{"cps":null,"name":"IP Locator","subMenuItems":null,"dps":null,"url":"/partner-tools/index.action?target=IPGeoLocator&tab=CONFIGURE&type=context&gid=64867","itemId":22575,"contextId":0}],"dps":null,"url":null,"itemId":22216,"contextId":0},{"cps":null,"name":"Fast DNS","subMenuItems":[{"cps":null,"name":"Configuration","subMenuItems":null,"dps":null,"url":"/portal/adns.jsp?sidebar=FastDNS_configuration&tab=CONFIGURE&type=context&gid=64867","itemId":22580,"contextId":0}],"dps":null,"url":null,"itemId":22220,"contextId":0},{"cps":null,"name":"NetStorage","subMenuItems":[{"cps":null,"name":"Configuration","subMenuItems":null,"dps":null,"url":"/storage/StorageInit.jsp?tab=CONFIGURE&type=context&gid=64867","itemId":22739,"contextId":0}],"dps":null,"url":null,"itemId":22255,"contextId":0},{"cps":null,"name":"Traffic Management","subMenuItems":[{"cps":null,"name":"Configuration","subMenuItems":null,"dps":null,"url":"/portal/gtm/domain_list.jsp?tab=CONFIGURE&type=context&gid=64867","itemId":22774,"contextId":0},{"cps":null,"name":"Dashboard (Beta)","subMenuItems":null,"dps":null,"url":"/config-gtm/web/gtmdash?tab=CONFIGURE&type=context&gid=64867","itemId":22775,"contextId":0}],"dps":null,"url":null,"itemId":22287,"contextId":0}]},{"id":4,"mainMenuItems":[{"cps":null,"name":"Organization","subMenuItems":[{"cps":null,"name":"Manage Users & Groups","subMenuItems":null,"dps":null,"url":"/admin/?tab=CONFIGURE&type=context&gid=64867","itemId":22566,"contextId":0},{"cps":null,"name":"Manage APIs","subMenuItems":null,"dps":null,"url":"/apiprov/?tab=CONFIGURE&type=context&gid=64867","itemId":22567,"contextId":0},{"cps":null,"name":"Manage SSO with SAML","subMenuItems":null,"dps":null,"url":"/core/ssoprovision/?tab=CONFIGURE&type=context&gid=64867","itemId":22568,"contextId":0},{"cps":null,"name":"Manage IP Whitelist","subMenuItems":null,"dps":null,"url":"/core/ipacl/?tab=CONFIGURE&type=context&gid=64867","itemId":22569,"contextId":0},{"cps":null,"name":"Contact Management","subMenuItems":null,"dps":null,"url":"/portal/contactmgmt/contact_management.jsp?tab=CONFIGURE&type=context&gid=64867","itemId":22570,"contextId":0}],"dps":null,"url":null,"itemId":22203,"contextId":0},{"cps":null,"name":"Media Analytics","subMenuItems":[],"dps":null,"url":"/ma/analytics/analyzer/analyzer.action?tab=CONFIGURE&type=context&gid=64867","itemId":22212,"contextId":0},{"cps":null,"name":"Download Analytics","subMenuItems":[],"dps":null,"url":"/dla/analytics/analyzer/analyzer.action?tab=CONFIGURE&type=context&gid=64867","itemId":22215,"contextId":0},{"cps":null,"name":"Performance Analytics","subMenuItems":[{"cps":null,"name":"Site Analyzer Test","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/siteAnalyzer/ViewSATestServlet?sidebar=PERF_analyzer_provision&tab=CONFIGURE&type=context&gid=64867","itemId":22748,"contextId":0},{"cps":null,"name":"Site Analyzer Alerts","subMenuItems":null,"dps":null,"url":"/alerts/?sidebar=PERF_analyzer_alerts&tab=CONFIGURE&type=context&gid=64867","itemId":22753,"contextId":0}],"dps":null,"url":null,"itemId":22260,"contextId":0},{"cps":null,"name":"SLA Management","subMenuItems":[{"cps":null,"name":"Provision Test","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=slaprov&tab=CONFIGURE&type=context&gid=64867","itemId":22760,"contextId":0}],"dps":null,"url":null,"itemId":22269,"contextId":0},{"cps":null,"name":"DNS SLA Management","subMenuItems":[{"cps":null,"name":"EDNS Test","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/views/sla/edns/provision.do?tab=CONFIGURE&type=context&gid=64867","itemId":22762,"contextId":0},{"cps":null,"name":"GTM Test","subMenuItems":null,"dps":null,"url":"/PerfAnalytics/views/sla/gtm/provision.do?tab=CONFIGURE&type=context&gid=64867","itemId":22763,"contextId":0}],"dps":null,"url":null,"itemId":22271,"contextId":0},{"cps":null,"name":"Real User Monitoring","subMenuItems":[],"dps":null,"url":"/core/productselector/selectproduct?module=rumConfig&tab=CONFIGURE&type=context&gid=64867","itemId":22272,"contextId":0},{"cps":null,"name":"Log Delivery","subMenuItems":[],"dps":null,"url":"/apps/lds?tab=CONFIGURE&type=context&gid=64867","itemId":22288,"contextId":0},{"cps":null,"name":"Alerts","subMenuItems":[],"dps":null,"url":"/alerts-api/redirect?tab=CONFIGURE&type=context&gid=64867","itemId":22289,"contextId":0},{"cps":null,"name":"Tools","subMenuItems":[],"dps":null,"url":"/core/productselector/selectproduct?module=tools&tab=CONFIGURE&type=context&gid=64867","itemId":22290,"contextId":0}]}],"itemId":2},{"tabId":3,"active":false,"name":"PUBLISH","englishName":"PUBLISH","url":null,"columns":[{"id":1,"mainMenuItems":[{"cps":null,"name":"Content Control Utility","subMenuItems":[],"dps":null,"url":"/core/productselector/selectproduct?module=ccu&tab=PUBLISH&type=context&gid=64867","itemId":22197,"contextId":0}]},{"id":2,"mainMenuItems":[{"cps":null,"name":"Live Media","subMenuItems":[{"cps":null,"name":"Manage Streams","subMenuItems":null,"dps":null,"url":"/core/productselector/selectproduct?module=strm&tab=PUBLISH&type=context&gid=64867","itemId":22645,"contextId":0}],"dps":null,"url":null,"itemId":22240,"contextId":0}]},{"id":3,"mainMenuItems":[{"cps":null,"name":"NetStorage","subMenuItems":[{"cps":null,"name":"File Manager 2.0","subMenuItems":null,"dps":null,"url":"/filemgr/ui/landing?tab=PUBLISH&type=context&gid=64867","itemId":22742,"contextId":0}],"dps":null,"url":null,"itemId":22256,"contextId":0},{"cps":null,"name":"Media Services On Demand","subMenuItems":[{"cps":null,"name":"Media","subMenuItems":null,"dps":null,"url":"/media-workflow/init/publishMedia?tab=PUBLISH&type=context&gid=64867","itemId":22768,"contextId":0}],"dps":null,"url":null,"itemId":22284,"contextId":0}]}],"itemId":3},{"tabId":4,"active":false,"name":"RESOLVE","englishName":"RESOLVE","url":null,"columns":[{"id":3,"mainMenuItems":[{"cps":null,"name":"Diagnostic Tools","subMenuItems":[],"dps":null,"url":"/resolve/diagnostic_tools?tab=RESOLVE&type=context&gid=64867","itemId":22201,"contextId":0}]},{"id":4,"mainMenuItems":[{"cps":null,"name":"Active Alerts","subMenuItems":[],"dps":null,"url":"/alerts/?sidebar=HOME_alerts&tab=RESOLVE&type=context&gid=64867","itemId":22180,"contextId":0},{"cps":null,"name":"Resolve Home","subMenuItems":[],"dps":null,"url":"/resolve/home?tab=RESOLVE&type=context&gid=64867","itemId":22262,"contextId":0},{"cps":null,"name":"Tasks","subMenuItems":[],"dps":null,"url":"/batman/index.jsp?tab=RESOLVE&type=context&gid=64867","itemId":22264,"contextId":0},{"cps":null,"name":"Akamai Community","subMenuItems":[],"dps":null,"url":"/partners/PartnerLogin?partnerId=jive&sidebar=ADMIN_jive&tab=RESOLVE&type=context&gid=64867","itemId":22266,"contextId":0}]}],"itemId":4},{"tabId":5,"active":false,"name":"PLAN","englishName":"PLAN","url":null,"columns":[{"id":2,"mainMenuItems":[{"cps":null,"name":"Event Center","subMenuItems":[{"cps":null,"name":"Scheduler","subMenuItems":null,"dps":null,"url":"/events/view/scheduler?tab=PLAN&type=context&gid=64867","itemId":22585,"contextId":0},{"cps":null,"name":"Reports","subMenuItems":null,"dps":null,"url":"/events/view/scheduler#view=list&filter=past?tab=PLAN&type=context&gid=64867","itemId":22587,"contextId":0},{"cps":null,"name":"Internal Event Calendar","subMenuItems":null,"dps":null,"url":"/events/view/scheduler/internal?tab=PLAN&type=context&gid=64867","itemId":22588,"contextId":0},{"cps":null,"name":"Internal Event List","subMenuItems":null,"dps":null,"url":"/events/view/scheduler/internal#view=list?tab=PLAN&type=context&gid=64867","itemId":22590,"contextId":0},{"cps":null,"name":"Event Center API","subMenuItems":null,"dps":null,"url":"/events-dl/restdoc/index.html?tab=PLAN&type=context&gid=64867","itemId":22592,"contextId":0}],"dps":null,"url":null,"itemId":22225,"contextId":0}]}],"itemId":5}]}
 * GET /ui/services/nav/megamenu/currentUser/context.json?id=-781018036
 *      {"context":{"mainMenuItems":[{"subMenuItems":[{"subMenuItems":null,"dps":["liquidmatrix.org"],"cps":null,"itemId":0,"name":"www.liquidmatrix.org","url":"/ui/home?cs=site&aid=10333701&gid=64867","contextId":1},{"subMenuItems":null,"dps":["api.sephora.com.edgedemo.com.edgekey-staging.net","api.sephora.com.2015edgedemos.com","api.sephora.com.edgedemo.com","api.sephora.com.edgedemo.com.edgekey.net"],"cps":null,"itemId":0,"name":"api.sephora.com.edgedemo.com","url":"/ui/home?cs=site&aid=10357352&gid=64867","contextId":1},{"subMenuItems":null,"dps":["*-msltest-lh.akamaihd.net","msltest-lh.akamaihd.net"],"cps":null,"itemId":0,"name":"msltest-lh.akamaihd.net","url":"/ui/home?cs=lm&aid=10384825&gid=64867","contextId":5},{"subMenuItems":[{"subMenuItems":null,"dps":["akadev.interlude.org.uk"],"cps":null,"itemId":0,"name":"akadev.interlude.org.uk","url":"/ui/home?cs=site&aid=10396096&gid=65082","contextId":1},{"subMenuItems":null,"dps":["www.biscuits.org.uk","www.biscuit.org.uk","biscuit.org.uk.edgesuite.net"],"cps":null,"itemId":0,"name":"www.biscuit.org.uk","url":"/ui/home?cs=site&aid=10331378&gid=65082","contextId":1},{"subMenuItems":null,"dps":["www.slackware.com"],"cps":null,"itemId":0,"name":"www.slackware.com","url":"/ui/home?cs=app&aid=5931823&gid=65082","contextId":2},{"subMenuItems":null,"dps":["arm.slackware.com"],"cps":null,"itemId":0,"name":"arm.slackware.com","url":"/ui/home?cs=site&aid=6039419&gid=65082","contextId":1},{"subMenuItems":null,"dps":["docs.slackware.com"],"cps":null,"itemId":0,"name":"docs.slackware.com","url":"/ui/home?cs=site&aid=6229901&gid=65082","contextId":1},{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"stwinter-cloudmonitor","url":"/ui/home?cs=app&aid=10362552&gid=65082","contextId":2}],"dps":null,"cps":null,"itemId":65082,"name":"Stuart Winter","url":"/ui/home?cs=g&gid=65082","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"colinbendell.com","url":"/ui/home?cs=site&aid=10400059&gid=65090","contextId":1},{"subMenuItems":null,"dps":["2.colinbendell.com","h2cwnd10.colinbendell.com","h2cwnd24.colinbendell.com","colinbendell.com","h1cwnd32.colinbendell.com","1.colinbendell.com","3.colinbendell.com","h1cwnd24.colinbendell.com","h1cwnd10.colinbendell.com","h2cwnd32.colinbendell.com","4.colinbendell.com","js.colinbendell.com","h1cwnd16.colinbendell.com","www.colinbendell.com","h2cwnd16.colinbendell.com","img.colinbendell.com"],"cps":null,"itemId":0,"name":"www.colinbendell.com","url":"/ui/home?cs=site&aid=10381434&gid=65090","contextId":1},{"subMenuItems":null,"dps":["bendell.ca","qa.bendell.ca","5.bendell.ca","2.bendell.ca","3.bendell.ca","4.bendell.ca","1.bendell.ca"],"cps":null,"itemId":0,"name":"www.bendell.ca","url":"/ui/home?cs=site&aid=10330212&gid=65090","contextId":1},{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"suren.com","url":"/ui/home?cs=site&aid=10413034&gid=65090","contextId":1},{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"apiprincesstest.com","url":"/ui/home?cs=site&aid=10382771&gid=65090","contextId":1},{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"apiprincess.com","url":"/ui/home?cs=site&aid=10382524&gid=65090","contextId":1},{"subMenuItems":null,"dps":["im-florist.akamaiflowershop.colinbendell.com"],"cps":null,"itemId":0,"name":"im-flowershop-tifoster","url":"/ui/home?cs=site&aid=10384928&gid=65090","contextId":1},{"subMenuItems":null,"dps":["push-san.colinbendell.com","push.colinbendell.com","push-ext.colinbendell.com"],"cps":null,"itemId":0,"name":"push.colinbendell.com","url":"/ui/home?cs=site&aid=10394251&gid=65090","contextId":1},{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"varnish.colinbendell.com","url":"/ui/home?cs=site&aid=10390126&gid=65090","contextId":1}],"dps":null,"cps":null,"itemId":65090,"name":"Colin Bendell","url":"/ui/home?cs=g&gid=65090","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":["cloudmonitor.princesspolymath.com"],"cps":null,"itemId":0,"name":"cloudmonitor.princesspolymath.com","url":"/ui/home?cs=app&aid=10336413&gid=65092","contextId":2},{"subMenuItems":null,"dps":["synedra.rocks","princesspolymath.com","polyglot.codes"],"cps":null,"itemId":0,"name":"princesspolymath.com","url":"/ui/home?cs=site&aid=10330226&gid=65092","contextId":1},{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"synedra.rocks","url":"/ui/home?cs=site&aid=10400276&gid=65092","contextId":1}],"dps":null,"cps":null,"itemId":65092,"name":"Kirsten Hunter","url":"/ui/home?cs=g&gid=65092","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":["timkadlec.com"],"cps":null,"itemId":0,"name":"timkadlec.com","url":"/ui/home?cs=site&aid=10333792&gid=65093","contextId":1},{"subMenuItems":null,"dps":["www.wpostats.com","wpostats.com"],"cps":null,"itemId":0,"name":"wpostats.com","url":"/ui/home?cs=site&aid=10363194&gid=65093","contextId":1}],"dps":null,"cps":null,"itemId":65093,"name":"Tim Kadlec","url":"/ui/home?cs=g&gid=65093","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":["daveyshafik.com"],"cps":null,"itemId":0,"name":"daveyshafik.com","url":"/ui/home?cs=site&aid=10347707&gid=68817","contextId":1},{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"staging.daveyshafik.com","url":"/ui/home?cs=site&aid=10384283&gid=68817","contextId":1},{"subMenuItems":null,"dps":["s2.daveyshafik.com","s1.daveyshafik.com"],"cps":null,"itemId":0,"name":"s.daveyshafik.com","url":"/ui/home?cs=site&aid=10389570&gid=68817","contextId":1}],"dps":null,"cps":null,"itemId":68817,"name":"Davey Shafik","url":"/ui/home?cs=g&gid=68817","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":["geekgonenomad.com"],"cps":null,"itemId":0,"name":"geekgonenomad.com","url":"/ui/home?cs=site&aid=10364188&gid=70463","contextId":1}],"dps":null,"cps":null,"itemId":70463,"name":"Kyle Tyacke","url":"/ui/home?cs=g&gid=70463","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":["yoav.ws"],"cps":null,"itemId":0,"name":"www.yoav.ws","url":"/ui/home?cs=site&aid=10333687&gid=70846","contextId":1}],"dps":null,"cps":null,"itemId":70846,"name":"Yoav Weiss","url":"/ui/home?cs=g&gid=70846","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":["www.akamaiapibootcamp.com","akamaiapibootcamp.com"],"cps":null,"itemId":0,"name":"akamaiapibootcamp.com","url":"/ui/home?cs=site&aid=10375998&gid=77649","contextId":1},{"subMenuItems":null,"dps":["bc.akamaiapibootcamp.com","bootcamp.akamaiapibootcamp.com"],"cps":null,"itemId":0,"name":"bootcamp.akamaiapibootcamp.com","url":"/ui/home?cs=site&aid=10381818&gid=77649","contextId":1}],"dps":null,"cps":null,"itemId":77649,"name":"API Bootcamp","url":"/ui/home?cs=g&gid=77649","contextId":0},{"subMenuItems":[{"subMenuItems":null,"dps":null,"cps":null,"itemId":0,"name":"nicktran.com","url":"/ui/home?cs=site&aid=10409692&gid=88314","contextId":1}],"dps":null,"cps":null,"itemId":88314,"name":"Nick Tran","url":"/ui/home?cs=g&gid=88314","contextId":0}],"dps":null,"cps":null,"itemId":64867,"name":"Akamai DevRel","url":"/ui/home?cs=g&gid=64867","contextId":0}],"menuTitle":"Select Context","changeTitle":"Change Account","findTitle":"Find Context","helpTitle":"Help","current":"Akamai DevRel & Advocates","url":"#","title":"Select Group or Property","helpURL":"/dl/rd/contextselector/contextselector.htm"},"users":null,"tabs":null,"hasAccounts":null,"currentAccount":null,"accounts":null,"contextTitle":null}
 *
 *
 * @returns {Promise}
 * @private
 */
APIClient.prototype._getAPIGroup = function() {
    //let url = "/ui/services/nav/megamenu/currentUser/grp.json";
    let url = "/ui/services/nav/megamenu/currentUser/context.json";
    return this._luna.request('GET', url)
    .then((response) => {
        return new Promise((resolve, reject) => {
            console.info("... retrieving default contract group id");
            //TODO: check auth
            let parsed = JSON.parse(response.body);
            if (parsed && parsed.context && parsed.context.mainMenuItems && parsed.context.mainMenuItems.length > 0) {
                let groupId = parsed.context.mainMenuItems[0].itemId;
                resolve(groupId);
            }
            //let matches = response.body.match(/\/apiprov\/\?tab=CONFIGURE&type=context&gid=['"]?(\d+)\D/);
            //something like the jpath below. Faster/more convenient to use a regex...
            //parsed.tabs[.name==="Configure"].columns[.mainMenuItems[.name==="Organization"]].mainMenuItems[.name==="Organization"].subMenuItems[.name==="Manage APIs"].url
            // if (matches) {
            //     let groupID = matches[1];
            //     resolve(groupID);
            // }
            else {
                reject(Error("ERROR: cannot find the API Management control in the megamenu"));
            }
        });
    });
};

// navtree
// GET /apiprov/api/v1/ui/navtree/64867?sort=%5B%7B%22property%22%3A%22name%22%2C%22direction%22%3A%22ASC%22%7D%5D&node=root
//      [{"id":600,"name":"CSI","description":"CSI","type":"service_provider","groupId":64867,"children":[{"id":87677,"name":"colinbendell","description":null,"type":"client_collection","groupId":64867,"children":[{"id":91734,"name":"colinbendell","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true}],"active":true},{"id":1,"name":"Luna APIs","description":"APIs from the Luna Service Provider","type":"service_provider","groupId":64867,"children":[{"id":69451,"name":"Colin Bendell","description":null,"type":"client_collection","groupId":64867,"children":[{"id":67451,"name":"colinbendell","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":69569,"name":"Stuart Winter","description":null,"type":"client_collection","groupId":64867,"children":[{"id":67573,"name":"stuartwinter","description":"API","type":"client","groupId":64867,"children":[],"active":true},{"id":128573,"name":"ccuAPI","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":180586,"name":"CCU","description":"CCU","type":"client","groupId":64867,"children":[],"active":true},{"id":180583,"name":"Diagnostic Tools","description":"Diagnostic tool APIs","type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":70568,"name":"Bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":70773,"name":"Davey","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":70816,"name":"PAPI","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":91623,"name":"DNS","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":117555,"name":"pktest","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":115558,"name":"digging","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":115559,"name":"Dileep Mishra","description":"Bootcamp training","type":"client","groupId":64867,"children":[],"active":true},{"id":115561,"name":"DP_purge","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":115557,"name":"DeepaParikh","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":117553,"name":"Saurabh","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":117558,"name":"pkccu","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":117560,"name":"pktestgtm","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":115754,"name":"Leo","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":116554,"name":"David","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":116556,"name":"Loncar","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":145556,"name":"Diagnostic Tools Atlanta","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":142597,"name":"Test52","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":69783,"name":"Kunjal-test","description":null,"type":"client_collection","groupId":64867,"children":[{"id":68634,"name":"SPS-user","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":77908,"name":"API Training","description":null,"type":"client_collection","groupId":64867,"children":[{"id":76911,"name":"Kirsten","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":76882,"name":"Dig","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":115700,"name":"GTM","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":129573,"name":"PAPI for bootcamp","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":112596,"name":"GTM","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":118687,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":129561,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":115702,"name":"Testing Cloudlets","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":137552,"name":"Cloudlets","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":143579,"name":"MSFT Morning Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":145552,"name":"Atlanta Morning","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":143580,"name":"Microsoft Afternoon Dig","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":143565,"name":"Diagnostic tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":150571,"name":"New Dig","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":165550,"name":"LDS","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":151557,"name":"Restoration Hardware","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":178682,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":167692,"name":"adsf","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":178680,"name":"Diagnostic Tools - News","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":181582,"name":"Tesco","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":87660,"name":"Kyle Testing","description":null,"type":"client_collection","groupId":64867,"children":[{"id":91714,"name":"papi","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":102553,"name":"billing-center","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":105569,"name":"edge-redirector","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":102595,"name":"user-admin","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":111590,"name":"media-analytics","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":111591,"name":"media-streaming","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":111592,"name":"hdnetwork","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":118665,"name":"origin-offload","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":118667,"name":"dns","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":118655,"name":"event-center","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":118696,"name":"gtm","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":118654,"name":"media-reports","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":142583,"name":"prolexic-analytics","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":151578,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":142596,"name":"Cloudlets","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":156612,"name":"cps","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":91568,"name":"NuSkin","description":null,"type":"client_collection","groupId":64867,"children":[{"id":95568,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":87570,"name":"Davey Shafik","description":null,"type":"client_collection","groupId":64867,"children":[{"id":94551,"name":"global","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":144567,"name":"cloudlets","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":144586,"name":"CCUv3","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":95316,"name":"Kirsten Jenkins","description":null,"type":"client_collection","groupId":64867,"children":[{"id":102270,"name":"Billing Usage for Testing","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":95317,"name":"Kirsten Testing","description":null,"type":"client_collection","groupId":64867,"children":[{"id":115554,"name":"asdf","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":108581,"name":"Kirsten India","description":null,"type":"client_collection","groupId":64867,"children":[],"active":true},{"id":103576,"name":"Kirsten India","description":null,"type":"client_collection","groupId":64867,"children":[{"id":110778,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":103579,"name":"India Bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":110783,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":103571,"name":"India Bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":110772,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":114557,"name":"New York","description":null,"type":"client_collection","groupId":64867,"children":[{"id":117564,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":116586,"name":"CologneBootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":136553,"name":"PAPI","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":136554,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":114551,"name":"Kirsten","description":null,"type":"client_collection","groupId":64867,"children":[{"id":117550,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":116568,"name":"Kirsten Bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":118675,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":145557,"name":"Dig","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":127559,"name":"Kirsten Vienna","description":null,"type":"client_collection","groupId":64867,"children":[],"active":true},{"id":127560,"name":"User","description":null,"type":"client_collection","groupId":64867,"children":[{"id":129568,"name":"User Admin","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":138803,"name":"New User","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":116575,"name":"Kirsten Sydney","description":null,"type":"client_collection","groupId":64867,"children":[{"id":118686,"name":"Dig","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":113552,"name":"Gk","description":null,"type":"client_collection","groupId":64867,"children":[{"id":116552,"name":"Dia  tool","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":144584,"name":"Tokyo Bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":145591,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":139653,"name":"Munich Internal","description":null,"type":"client_collection","groupId":64867,"children":[{"id":138808,"name":"jfordema","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":138653,"name":"ah","description":"ah","type":"client","groupId":64867,"children":[],"active":true},{"id":138654,"name":"evidenee","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":138755,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":156604,"name":"Toronto Bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":156606,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":156602,"name":"Avis","description":null,"type":"client_collection","groupId":64867,"children":[{"id":156605,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":149555,"name":"FarePortal","description":null,"type":"client_collection","groupId":64867,"children":[{"id":151568,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":151569,"name":"network-lists","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":173604,"name":"Bluestem","description":null,"type":"client_collection","groupId":64867,"children":[{"id":183655,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":175550,"name":"Irvine","description":null,"type":"client_collection","groupId":64867,"children":[{"id":185550,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":161656,"name":"Richmond Bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":169607,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":160743,"name":"RueLaLa","description":null,"type":"client_collection","groupId":64867,"children":[{"id":173564,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":161631,"name":"Kirsten FLL","description":null,"type":"client_collection","groupId":64867,"children":[{"id":168639,"name":"Dig","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":171552,"name":"Kirsten Krakow","description":null,"type":"client_collection","groupId":64867,"children":[{"id":180552,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":172554,"name":"bjakubow api bootcamp","description":null,"type":"client_collection","groupId":64867,"children":[{"id":181555,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":160594,"name":"Kirsten Edge Redirector","description":null,"type":"client_collection","groupId":64867,"children":[{"id":172551,"name":"Redirect princesspolymath.com","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":161667,"name":"Kirsten Mountain View","description":null,"type":"client_collection","groupId":64867,"children":[{"id":169619,"name":"Diagnostic Tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":160722,"name":"Stockholm","description":null,"type":"client_collection","groupId":64867,"children":[{"id":167687,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":173606,"name":"Target","description":null,"type":"client_collection","groupId":64867,"children":[{"id":183658,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":168557,"name":"rwolosiu","description":null,"type":"client_collection","groupId":64867,"children":[{"id":177558,"name":"rwolosiu","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":173602,"name":"BestBuy","description":null,"type":"client_collection","groupId":64867,"children":[{"id":183653,"name":"diagnostic-tools","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":168556,"name":"rgauthie-krk","description":null,"type":"client_collection","groupId":64867,"children":[{"id":177557,"name":"romain-test","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true}],"active":true},{"id":3,"name":"Image Manager","description":"APIs for Image Manager2","type":"service_provider","groupId":64867,"children":[{"id":104586,"name":"Colin Bendell","description":null,"type":"client_collection","groupId":64867,"children":[{"id":111594,"name":"colinbendell","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true}],"active":true},{"id":2,"name":"CCU APIs","description":"APIs for CCU","type":"service_provider","groupId":64867,"children":[{"id":104587,"name":"Colin Bendell","description":null,"type":"client_collection","groupId":64867,"children":[{"id":111595,"name":"colinbendell","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":114553,"name":"pktest","description":null,"type":"client_collection","groupId":64867,"children":[{"id":117554,"name":"pkclient","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":143582,"name":"Davey Shafik","description":null,"type":"client_collection","groupId":64867,"children":[{"id":144587,"name":"daveyshafik","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":144553,"name":"Kirsten","description":null,"type":"client_collection","groupId":64867,"children":[{"id":145554,"name":"Purge content","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":145594,"name":"Tokyo CCU","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":143581,"name":"CCU","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":156608,"name":"Purge","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":151559,"name":"Purge","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":180555,"name":"Purge","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":181583,"name":"Purge","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":178683,"name":"News","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":169621,"name":"CCU","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":142696,"name":"Test","description":null,"type":"client_collection","groupId":64867,"children":[{"id":163554,"name":"ccu-v3","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":151554,"name":"Kyle CCU","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":156607,"name":"tiffany","description":null,"type":"client_collection","groupId":64867,"children":[{"id":156611,"name":"ccu","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":171554,"name":"Kirsten","description":null,"type":"client_collection","groupId":64867,"children":[],"active":true},{"id":168558,"name":"romain-krk","description":null,"type":"client_collection","groupId":64867,"children":[{"id":177559,"name":"romain-test","description":"test","type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":168559,"name":"rwolosiu2","description":null,"type":"client_collection","groupId":64867,"children":[{"id":177560,"name":"rwolosiu2","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":173607,"name":"Target","description":null,"type":"client_collection","groupId":64867,"children":[{"id":183659,"name":"ccu","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":173605,"name":"Bluestem","description":null,"type":"client_collection","groupId":64867,"children":[{"id":183656,"name":"ccu","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":160723,"name":"STHLM-CCU","description":null,"type":"client_collection","groupId":64867,"children":[{"id":167688,"name":"ccu","description":null,"type":"client","groupId":64867,"children":[],"active":true},{"id":179602,"name":"patryk.jurkiewicz","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":171556,"name":"pduarte-api","description":null,"type":"client_collection","groupId":64867,"children":[{"id":180557,"name":"john","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":161634,"name":"Fort Lauderdale","description":null,"type":"client_collection","groupId":64867,"children":[{"id":168642,"name":"Purge","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true},{"id":171578,"name":"Stuart Winter","description":null,"type":"client_collection","groupId":64867,"children":[{"id":180587,"name":"ccu","description":"CCU","type":"client","groupId":64867,"children":[],"active":true}],"active":true}],"active":true},{"id":700,"name":"dns","description":"dns","type":"service_provider","groupId":64867,"children":[{"id":161612,"name":"colinbendell","description":null,"type":"client_collection","groupId":64867,"children":[{"id":168618,"name":"colinbendell","description":null,"type":"client","groupId":64867,"children":[],"active":true}],"active":true}],"active":true}]
APIClient.prototype._getAPINavTree = function(groupId) {
    if (!groupId) {
        return this._getAPIGroup()
            .then((newGroupID) => this._getAPINavTree(newGroupID));
    }

    let url = util.format("/apiprov/api/v1/ui/navtree/%s?sort=%5B%7B%22property%22%3A%22name%22%2C%22direction%22%3A%22ASC%22%7D%5D&node=root", groupId);
    return this._luna.request('GET', url)
        .then((response) => {
            return new Promise((resolve) => {
                console.info("... retrieving API nav tree {contract group id: %s}", groupId);
                let navtree = JSON.parse(response.body);
                navtree.groupId = groupId;
                resolve(navtree);
            });
        });
};


// create collection
// POST /apiprov/api/v1/client_collections?_dc=1470588955467
//      {"name":"testcollection2","description":"","groupId":64867,"serviceProviderId":2,"clientRoleId":1}
//      {"createdDate":"2016-08-07T16:55:46Z","modifiedDate":"2016-08-07T16:55:46Z","createdBy":"colinb","modifiedBy":"colinb","clientCollectionId":173826,"groupId":64867,"serviceConsumerToken":"akab-yo4ekaksygh4zl3d-2tueyummutrsyluu","clientRoleId":1,"serviceProviderId":2,"name":"testcollection2","description":"","deleted":false}

/**
 *
 * @param clientData
 * @returns {Promise}
 * @private
 */
APIClient.prototype._getAPICollection = function(clientData) {
    console.info("[API Management]");
    return this._getAPINavTree()
        .then(navTree => {
            clientData.groupId = navTree.groupId;
            clientData._navTree = navTree;

            let serviceNode = navTree.find(function (val) {
                return val && val.name && val.name === clientData.app.service
            });
            clientData._serviceProvider = serviceNode;
            let serviceID = serviceNode.id;
            // console.info("Found ServiceNode:");
            let childNode = serviceNode.children.find(function (val) {
                return val && val.name && val.name === clientData.app.folder
            });
            if (!childNode) {

                let postData = {
                    "name": clientData.app.folder,
                    "description": clientData.collectionDescription || "",
                    "groupId": clientData.groupId,
                    "serviceProviderId": serviceID,
                    "clientRoleId": 1
                }; //I have no idea what a clientRoleId is

                let url = util.format("/apiprov/api/v1/client_collections?_dc=%d", Date.now());
                return this._luna.request('POST', url, {json: postData})
                    .then((response) => {
                        let body = response.body;
                        return new Promise((resolve) => {
                            console.info("... creating new app collection {name: '%s', service provider id: %s}", clientData.app.folder, serviceID);

                            //TODO: check response
                            // childNode = JSON.parse(body);
                            //shim the response
                            body.id = body.clientCollectionId;
                            body.children = [];
                            clientData._collectionNode = body;
                            resolve(clientData);
                        });
                    });
            } else {
                return new Promise((resolve) => {
                    clientData._collectionNode = childNode;
                    resolve(clientData);
                });
            }
        });
};


/**
 * create client
 * POST /apiprov/api/v1/clients?_dc=1469594745054
 * {name: "test1", description: "desc1", clientCollectionId: 104587}
 * {"createdDate":"2016-07-27T04:53:13Z","modifiedDate":"2016-07-27T04:53:13Z","createdBy":"colinb","modifiedBy":"colinb","clientId":183768,"clientCollectionId":104587,"name":"test1","description":"desc1","externalId":"rycq5essciodz7y2","deleted":false}
 *
 * @param queryData
 * @returns {Promise}
 * @private
 */
APIClient.prototype._getClient = function(queryData) {
    return this._getAPICollection(queryData)
    .then(() => {
        let clientNode = queryData._collectionNode.children.find(function(val) {return val && val.name && val.name === queryData.app.name});
        if (!clientNode) {
            let postData = {
                "name": queryData.app.name,
                "description":queryData.clientDescription || "",
                "clientCollectionId":queryData._collectionNode.id
            };

            let url = util.format("/apiprov/api/v1/clients?_dc=%d", Date.now());
            return this._luna.request('POST', url, {json: postData})
                .then((response) => {
                    let body = response.body;
                    return new Promise((resolve) => {
                        console.info("... creating new client app {name: '%s', collection id: %s}", queryData.app.name, queryData._collectionNode.id);
                        //clientNode = JSON.parse(body);
                        //shim the response
                        body.id = body.clientId;
                        queryData._clientNode = body;
                        queryData.clientId = queryData._clientNode.id;
                        resolve(queryData);
                    });
                });
        } else {
            return new Promise((resolve) => {
                queryData._clientNode = clientNode;
                queryData.clientId = queryData._clientNode.id;
                resolve(queryData);
            });
        }
    });
};

// POST /apiprov/api/v1/clients/187568/credentials
//      {"createdDate":"2016-08-08T01:36:05Z","modifiedDate":"2016-08-08T01:36:05Z","createdBy":"advocate2","modifiedBy":"advocate2","clientCredentialId":194201,"clientId":187568,"clientToken":"akab-2useeknlmvzj4e3c-h3pb5dwfp4ms5sqx","status":"active","secret":"fsEFrx6TJgTERN/ednYAiRLhlFa3UsA64Hspr6+bPkI="}
APIClient.prototype._createClientCredentials = function(clientData) {
    let clientId = clientData.clientId;
    let url = util.format("/apiprov/api/v1/clients/%d/credentials", clientId);
    return this._luna.request('POST', url)
    .then((response) => {
        return new Promise((resolve, reject) => {
            console.info("... creating new app credentials {client id: %s}", clientId);
            if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                let clientCreds = JSON.parse(response.body);
                resolve(clientCreds);
            } else {
                reject(Error('ERROR: could not create credentials'));

            }
        });
    });
};

// GET /apiprov/api/v1/clients/183768/credentials?_dc=1469595322474&page=1&start=0&limit=9999&sort=%5B%7B%22property%22%3A%22name%22%2C%22direction%22%3A%22ASC%22%7D%5D&filter=%5B%7B%22property%22%3A%22status%22%2C%22value%22%3Aundefined%7D%5D
//      [{"createdDate":"2016-07-27T04:53:14Z","modifiedDate":"2016-07-27T04:53:14Z","createdBy":"colinb","modifiedBy":"colinb","clientCredentialId":185523,"clientId":183768,"clientToken":"akab-62utmpnhrifcaku3-uumz62axpsxkj2xp","status":"active","secret":"8ta6p04/Ztv4WLVe32hwBcBVnbR2yK15HXEMu2m6mcc="}]

APIClient.prototype._getClientCredentials = function(clientData) {
    let clientId = clientData.clientId;
    console.info("... retrieving app credentials {client id: %s}", clientId);
    let url = util.format("/apiprov/api/v1/clients/%s/credentials?_dc=%d", clientId, Date.now());
    return this._luna.request('GET', url)
        .then((response) => {
            let body = response.body;

            //TODO: check response
            //TODO: validate response
            if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                let creds = JSON.parse(body);
                creds = creds.filter(function(val) {return val && val.status && val.status === 'active'});
                if (!creds || creds.length < 1) {
                    return this._createClientCredentials(clientData)
                        .then((newData) => {
                            return new Promise((resolve, reject) => {
                                clientData.credentials = [newData];
                                resolve(clientData);
                            });
                        });
                } else {
                    return new Promise((resolve) => {
                        clientData.credentials = creds;
                        resolve(clientData);
                    });
                }
            } else {
                throw Error('error with credentials API');
            }
        });
};

// get entitlements
// GET /apiprov/api/v1/service_providers/2/services?_dc=1469595263636&page=1&start=0&limit=9999&sort=%5B%7B%22property%22%3A%22name%22%2C%22direction%22%3A%22ASC%22%7D%5D&group_id=64867
//      [{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","serviceId":122,"serviceProviderId":2,"name":"CCU APIs","description":"Content control utility APIs","endPoint":"/ccu","owner":"CCU","documentationUrl":"https://developer.akamai.com/","active":true,"grantModelId":3,"engProds":[{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"ccare2","modifiedBy":"ccare2","serviceId":122,"engProdId":"EDGECONTROL"},{"createdDate":"2015-06-25T02:58:17Z","modifiedDate":"2015-06-25T02:58:17Z","createdBy":"sthaladu","modifiedBy":"sthaladu","serviceId":122,"engProdId":"WholesaleDelivery::WholesaleDelivery"}],"marketingProds":["All Products"],"grantModel":null,"grantScopes":[{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","grantModelId":3,"name":"READ-ONLY","serviceId":122,"guid":"a3e90462-30ff-4354-b94a-a44a98da1c50","description":"READ-ONLY","documentationUrl":"/","allowedRateLimit":10,"permission":null},{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","grantModelId":3,"name":"READ-WRITE","serviceId":122,"guid":"ece7fac1-fad4-444d-aee4-3f74fc6e35f2","description":"READ-WRITE","documentationUrl":"/","allowedRateLimit":10,"permission":null}],"grantModelName":"CCU APIs Grant model","grantModelDescription":"Grant model for CCU APIs"}]
APIClient.prototype._getServiceProviderServices = function(groupId, serviceProviderId) {
    let url = util.format("/apiprov/api/v1/service_providers/%s/services?_dc=%d&page=1&start=0&limit=9999&sort=%5B%7B%22property%22%3A%22name%22%2C%22direction%22%3A%22ASC%22%7D%5D&group_id=%s", serviceProviderId, Date.now(), groupId);
    return this._luna.request('GET', url)
        .then((response) => {
            let body = response.body;

            return new Promise((resolve, reject) => {
                console.info("... retrieving service provide details {service id: %s}", serviceProviderId);
                //TODO: check response
                //TODO: validate response
                if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                    let services = JSON.parse(body);
                    resolve(services);
                } else {
                    reject(Error('ERROR: cannot get Service Provider Services'));
                }
            });
        });
};

// GET /apiprov/api/v1/grant_models/3?_dc=1469595273209&id=3&group_id=64867
//      {"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","grantModelId":3,"grantRoleId":1,"jsonSchema":"content_policy {\n      global {\n        name: \"STATUS\"\n        value: \"$status\"\n      }\n      global {\n        name: \"SEQUENCE\"\n        value: \"$sequence\"\n      }\n\n      taxonomy {\n        name: \"default\"\n        category {\n          name: \"queues\"\n          condition {\n            type: REQUEST_URL_PATH_COMPONENT\n            param {\n              value: \"ccu\"\n            }\n          }\n          condition {\n            type: REQUEST_URL_PATH_COMPONENT\n            param {\n              value: \"v2\"\n            }\n          }\n          condition {\n            type: REQUEST_URL_PATH_COMPONENT\n            param {\n              value: \"queues\"\n            }\n          }\n          condition {\n            type: REQUEST_URL_FILENAME\n            param {\n    #set ($qlist_value = '' )\n    #foreach ($queue_name in $grant.validations.ccu_queue)\n    #if (\"$qlist_value\" != \"\")\n       #set ($qlist_value = $qlist_value + ' ')\n    #end\n       #set ($qlist_value = $qlist_value + $queue_name)\n    #end\n              value: \"$qlist_value\"\n              recursive: true\n            }\n            negated: true\n          }\n        }\n      }\n\n      policy {\n        name: \"SCOPE-AUTHORIZATION\"\n\n    #foreach ($scope in $grant.scopes)\n        rule {\n          selector: \"\"\n          result {\n            name: \"SCOPE\"\n            value: \"$scope\"\n          }\n          result {\n            name: \"CONSTRAINTS\"\n            value: \"\"\n          }\n        }\n    #end\n      }\n\n      policy {\n        name: \"REQUEST-VALIDATION\"\n\n        rule {\n          selector: \"//default/queues\"\n          result {\n            name: \"VALIDATOR_NAME\"\n            value: \"QUEUE_NAME: the queue name is invalid or not authorized to access the named queue.\"\n          }\n        }\n      }\n\n      policy {\n        name: \"RATE-LIMITING\"\n\n        rule {\n          selector: \"\"\n          result {\n            name: \"LIMIT\"\n            value: \"$grant.validations.rate_limit\"\n          }\n        }\n      }\n\n      policy {\n        name: \"REQUEST-DECORATION\"\n\n        rule {\n          selector: \"\"\n          result {\n            name: \"OPERATION\"\n            value: \"add\"\n          }\n          result {\n            name: \"HEADER_NAME\"\n            value: \"X-CPCODE-LIST-ID\"\n          }\n          result {\n            name: \"HEADER_VALUE\"\n            value: \"$grant.decorations.cpcode_list_id\"\n          }\n        }\n        rule {\n          selector: \"\"\n          result {\n            name: \"OPERATION\"\n            value: \"add\"\n          }\n          result {\n            name: \"HEADER_NAME\"\n            value: \"Syscomm-CCU-Purge-By-Code\"\n          }\n          result {\n            name: \"HEADER_VALUE\"\n            value: \"$grant.decorations.purge_by_cpcode\"\n          }\n        }\n      }\n\n      policy {\n        name: \"RESPONSE-DECORATION\"\n      }\n\n      policy {\n        name: \"ANNOTATION\"\n\n    #foreach ($annotation in $grant.annotations)\n        rule {\n          selector: \"\"\n          result {\n            name: \"NAME\"\n            value: \"$annotation.name\"\n          }\n          result {\n            name: \"VALUE\"\n            value: \"$annotation.value\"\n          }\n        }\n    #end\n      }\n    }","grantScopes":[{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","grantModelId":3,"name":"READ-ONLY","serviceId":122,"guid":"a3e90462-30ff-4354-b94a-a44a98da1c50","description":"READ-ONLY","documentationUrl":"/","allowedRateLimit":10,"permission":null},{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","grantModelId":3,"name":"READ-WRITE","serviceId":122,"guid":"ece7fac1-fad4-444d-aee4-3f74fc6e35f2","description":"READ-WRITE","documentationUrl":"/","allowedRateLimit":10,"permission":null}],"grantModelName":"CCU APIs Grant model","grantModelDescription":"Grant model for CCU APIs","grantRole":{"createdDate":"2013-09-26T03:00:20Z","modifiedDate":"2013-09-26T03:00:20Z","createdBy":"auto-import","modifiedBy":"auto-import","grantRoleId":1,"externalRoleId":1,"name":"direct-customer","description":"General Open Platform Role"},"grantModelParams":[{"grantModelId":3,"paramType":6,"externalPpsId":1,"paramName":"purge_by_cpcode","description":"Allow purge by cpcode","paramDataType":"boolean","paramCategory":"decorations","paramOrder":1,"required":true,"multiValue":false,"freeTextValueAllowed":false,"grantParamType":{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","paramTypeId":6,"name":"purge_by_cpcode","description":"boolean field, true allows cpcode purge","className":"purge_by_cpcode"},"paramValues":[]},{"grantModelId":3,"paramType":7,"externalPpsId":1,"paramName":"ccu_queue","description":"Queue name for CCU","paramDataType":"string","paramCategory":"validations","paramOrder":1,"required":true,"multiValue":true,"freeTextValueAllowed":false,"grantParamType":{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","paramTypeId":7,"name":"ccu_queue","description":"Queue name for CCU","className":"ccu_queue"},"paramValues":[{"name":"default","value":"default"},{"name":"emergency","value":"emergency"}]},{"grantModelId":3,"paramType":8,"externalPpsId":1,"paramName":"purge_cpcodes","description":"CP codes allowed for purge","paramDataType":"number","paramCategory":"decorations","paramOrder":8,"required":true,"multiValue":true,"freeTextValueAllowed":false,"grantParamType":{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","paramTypeId":8,"name":"purge_cpcodes","description":"cpcode list","className":"purge_cpcodes"},"paramValues":[{"name":"All","value":"-1"},{"name":"geekgonenomad.com(427518)","value":"427518"},{"name":"Davey Shafik (daveyshafik.com)(409449)","value":"409449"},{"name":"NoOne (DSD)(409448)","value":"409448"},{"name":"Colin Bendell (www.bendell.ca)(384447)","value":"384447"},{"name":"www.LUNADEVESC-2434-2.com(453928)","value":"453928"},{"name":"Yoav Weiss (www.yoav.ws)(389478)","value":"389478"},{"name":"www.lunadevesc2511.com(453935)","value":"453935"},{"name":"Tim Kadlec (timkadlec.com)(383577)","value":"383577"},{"name":"Kirsten Hunter (cloudmonitor.princesspolymath.com)(383576)","value":"383576"},{"name":"Stream Packaging test(453464)","value":"453464"},{"name":"Image Purge(486109)","value":"486109"},{"name":"DevRel 2(383569)","value":"383569"},{"name":"Davey Shafik (netstorage)(383568)","value":"383568"},{"name":"DevRel 4(383571)","value":"383571"},{"name":"DevRel 3(383570)","value":"383570"},{"name":"DevRel 6(383573)","value":"383573"},{"name":"DevRel 5(383572)","value":"383572"},{"name":"NoOne (DD)(383575)","value":"383575"},{"name":"DevRel 7(383574)","value":"383574"},{"name":"Stuart Winter (Slackware.com)(262242)","value":"262242"},{"name":"Dave Lewis (www.liquidmatrix.org)(386542)","value":"386542"},{"name":"Mark Nottingham (mnot.net)(386543)","value":"386543"},{"name":"Stuart Winter (biscuit-VPWaitingRoom)(387384)","value":"387384"},{"name":"Guy Podjarny (www.guypod.com)(386541)","value":"386541"},{"name":"stuartwinter-netstorage(387385)","value":"387385"},{"name":"NS(456185)","value":"456185"},{"name":"Kirsten Hunter (princesspolymath.com)(384473)","value":"384473"},{"name":"wpostats.com(426079)","value":"426079"},{"name":"Stuart Winter (www.biscuit.org.uk)(386968)","value":"386968"},{"name":"www.bendell.ca (New IM)(463557)","value":"463557"},{"name":"www.colinbendell.com(452336)","value":"452336"},{"name":"www.bendell.ca (Origin IM)(463556)","value":"463556"},{"name":"www.liquidmatrix.org(452272)","value":"452272"},{"name":"MediaAnalyticsBillingCPCode(392763)","value":"392763"},{"name":"test.com(449161)","value":"449161"}]},{"grantModelId":3,"paramType":9,"externalPpsId":1,"paramName":"rate_limit","description":"Rate limit","paramDataType":"number","paramCategory":"validations","paramOrder":9,"required":false,"multiValue":false,"freeTextValueAllowed":false,"grantParamType":{"createdDate":"2014-08-21T03:04:56Z","modifiedDate":"2014-08-21T03:04:56Z","createdBy":"auto-import","modifiedBy":"auto-import","paramTypeId":9,"name":"rate_limit","description":"Rate limit","className":"rate_limit"},"paramValues":[{"name":"1","value":"1"},{"name":"2","value":"2"},{"name":"3","value":"3"},{"name":"4","value":"4"},{"name":"5","value":"5"},{"name":"6","value":"6"},{"name":"7","value":"7"},{"name":"8","value":"8"},{"name":"9","value":"9"},{"name":"10","value":"10"}]}]}

APIClient.prototype._getServiceGrantModel = function(groupId, grantModelId) {
    let url = util.format("/apiprov/api/v1/grant_models/%s?_dc=%d&id=%s&group_id=%s", grantModelId, Date.now(), grantModelId, groupId);
    return this._luna.request('GET', url)
        .then((response) => {
            let body = response.body;

            return new Promise((resolve, reject) => {
                console.info("... retrieving grant model {grant model id: %s}", grantModelId);
                //TODO: check response
                //TODO: validate response
                if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                    let grants = JSON.parse(body);
                    resolve(grants);
                } else {
                    reject(Error('ERROR: cannot get GrantModel'));
                }
            });
        });
};

// create authorization
// POST /apiprov/api/v1/clients/183768/client_authorizations?_dc=1469595316884
//      {"clientId":0,"name":"auth1","description":"desc1","status":"inactive","params":[{"paramName":"purge_by_cpcode","paramValues":[true]},{"paramName":"ccu_queue","paramValues":["default"]},{"paramName":"purge_cpcodes","paramValues":["-1"]}],"services":[{"serviceId":122,"serviceScope":"READ-ONLY"},{"serviceId":122,"serviceScope":"READ-WRITE"}],"annotations":[]}
// or   {"clientId":0,"name":"All","description":"Desc","status":"inactive","params":[{"paramName":"luna-user","paramValues":["advocate2"]}],"services":[{"serviceId":10,"serviceScope":"READ-ONLY"},{"serviceId":10,"serviceScope":"READ-WRITE"},{"serviceId":1905,"serviceScope":"READ-ONLY"},{"serviceId":1905,"serviceScope":"READ-WRITE"},{"serviceId":4,"serviceScope":"READ-ONLY"},{"serviceId":4,"serviceScope":"READ-WRITE"},{"serviceId":2005,"serviceScope":"READ-ONLY"},{"serviceId":2005,"serviceScope":"READ-WRITE"},{"serviceId":5,"serviceScope":"READ-ONLY"},{"serviceId":5,"serviceScope":"READ-WRITE"},{"serviceId":1106,"serviceScope":"READ-WRITE"},{"serviceId":1,"serviceScope":"READ-ONLY"},{"serviceId":1,"serviceScope":"READ-WRITE"},{"serviceId":3,"serviceScope":"READ"},{"serviceId":105,"serviceScope":"READ-ONLY"},{"serviceId":105,"serviceScope":"READ-WRITE"},{"serviceId":405,"serviceScope":"READ-ONLY"},{"serviceId":405,"serviceScope":"READ-WRITE"},{"serviceId":11,"serviceScope":"READ-ONLY"},{"serviceId":11,"serviceScope":"READ-WRITE"},{"serviceId":1105,"serviceScope":"READ-ONLY"},{"serviceId":1105,"serviceScope":"READ-WRITE"},{"serviceId":1405,"serviceScope":"READ-ONLY"},{"serviceId":1405,"serviceScope":"READ-WRITE"},{"serviceId":161,"serviceScope":"READ-ONLY"},{"serviceId":161,"serviceScope":"READ-WRITE"},{"serviceId":1705,"serviceScope":"READ-ONLY"},{"serviceId":1705,"serviceScope":"READ-WRITE"},{"serviceId":162,"serviceScope":"READ-ONLY"},{"serviceId":162,"serviceScope":"READ-WRITE"},{"serviceId":61,"serviceScope":"READ"},{"serviceId":142,"serviceScope":"READ-ONLY"},{"serviceId":164,"serviceScope":"READ-ONLY"},{"serviceId":205,"serviceScope":"READ-WRITE"},{"serviceId":2,"serviceScope":"READ-ONLY"},{"serviceId":2,"serviceScope":"READ-WRITE"},{"serviceId":144,"serviceScope":"READ-ONLY"},{"serviceId":146,"serviceScope":"READ-ONLY"},{"serviceId":146,"serviceScope":"READ-WRITE"},{"serviceId":2505,"serviceScope":"READ-ONLY"},{"serviceId":2505,"serviceScope":"READ-WRITE"},{"serviceId":141,"serviceScope":"READ-ONLY"},{"serviceId":141,"serviceScope":"READ-WRITE"},{"serviceId":123,"serviceScope":"READ-ONLY"},{"serviceId":123,"serviceScope":"READ-WRITE"},{"serviceId":206,"serviceScope":"READ-WRITE"},{"serviceId":145,"serviceScope":"READ-ONLY"},{"serviceId":905,"serviceScope":"READ-ONLY"},{"serviceId":905,"serviceScope":"READ-WRITE"},{"serviceId":406,"serviceScope":"READ-ONLY"},{"serviceId":406,"serviceScope":"READ-WRITE"},{"serviceId":207,"serviceScope":"READ-ONLY"},{"serviceId":207,"serviceScope":"READ-WRITE"},{"serviceId":101,"serviceScope":"READ-ONLY"},{"serviceId":101,"serviceScope":"READ-WRITE"}],"annotations":[]}
//      {"createdDate":"2016-07-27T04:55:17Z","modifiedDate":"2016-07-27T04:55:17Z","createdBy":"colinb","modifiedBy":"colinb","clientAuthorizationId":167867,"clientId":183768,"name":"auth1","description":"desc1","accessToken":"akab-6okvk2ctd2ccn5zo-pauz4zmlkr5v4zqn","status":"inactive","testStatus":"inactive","lastTestDate":null,"activeVersionId":null,"params":[{"grantObjectParamId":328310,"clientAuthorizationId":167867,"paramType":8,"paramName":"purge_cpcodes","paramValueDataType":"number","paramValue":"-1","paramCategory":"decorations","paramValues":["-1"]},{"grantObjectParamId":328308,"clientAuthorizationId":167867,"paramType":6,"paramName":"purge_by_cpcode","paramValueDataType":"boolean","paramValue":"true","paramCategory":"decorations","paramValues":["true"]},{"grantObjectParamId":328309,"clientAuthorizationId":167867,"paramType":7,"paramName":"ccu_queue","paramValueDataType":"string","paramValue":"default","paramCategory":"validations","paramValues":["default"]}],"services":[{"clientAuthServiceId":402845,"clientId":183768,"serviceId":122,"clientAuthorizationId":167867,"serviceScope":"READ-ONLY","serviceName":"CCU APIs"},{"clientAuthServiceId":402846,"clientId":183768,"serviceId":122,"clientAuthorizationId":167867,"serviceScope":"READ-WRITE","serviceName":"CCU APIs"}],"annotations":[],"fullUrl":"https://akab-kqvssesweghjuxbc-u7oamxekh5d3av55.purge.akamaiapis.net/"}
APIClient.prototype._createClientAuthorizations = function(clientData) {

    let serviceProviderDetails = {};

    // Step 1: get the service provider serviecs detail which gives us a link to the grant models
    return this._getServiceProviderServices(clientData.groupId, clientData._serviceProvider.id)
        .then((serviceProviderList) => {
            //find the active service provider details
            serviceProviderDetails = serviceProviderList.filter(function (val) {
                return val && val.active && val.active == true
            });

            if (serviceProviderDetails && serviceProviderDetails.length > 0) {
                let grandModelId = serviceProviderDetails[0].grantModelId;
                // Step 2: Get the grant Model. this tells us which services are available and which params are needed. This
                // is really overly complicated and the naming is misleading because there really aren't 'roles' just a bunch
                // of service endpoints. And there are many!
                return this._getServiceGrantModel(clientData.groupId, grandModelId);
            }
            throw Error("Cannot find ServiceDetails for Provider ID: ", clientData._serviceProvider.id);
        })
        .then((grantDetails) => {
            let postData = {
                "clientId": 0,
                "name": clientData.authorizationName || clientData.grantScopes || "Grant All",
                "description": clientData.authorizationDescription || "",
                "status": "inactive",
                "params": clientData.authorizationParams || [],
                "services": clientData.authorizationServices || [],
                "annotations": []
            };

            if (postData.services.length < 1) {
                // we use READ-WRITE as a grantScope to mean all the grants. Otherwise we set it to just the names that
                // match the grant scope (eg: READ-ONLY). There isn't a convenient way to scope this to just a few
                // grants. This would have to be done manually
//                    postData.services = grantDetails.grantScopes
                postData.services = [].concat(...serviceProviderDetails
                    .map(function (val) {
                            return val.grantScopes
                                .filter(function (val) {
                                    return !clientData.grant || !clientData.grant.match || clientData.grant.match.test(val.name)
                                })
                                .map(function (val) {
                                        return {'serviceId': val.serviceId, 'serviceScope': val.name}
                                    }
                                )
                        }
                    ));
            }
            if (postData.params.length < 1) {
                postData.params = grantDetails.grantModelParams
                    .filter(function (val) {
                        return val.required == true
                    })
                    .map(function (val) {
                        let paramValue = [""];
                        if (val.paramValues && val.paramValues.length > 0) {
                            paramValue = [val.paramValues[0].value];
                        }
                        else if (val.paramDataType === 'boolean') {
                            paramValue = [true];
                        }
                        return {'paramName': val.paramName, 'paramValues': paramValue}
                    });
            }

            let clientId = clientData.clientId;
            let url = util.format("/apiprov/api/v1/clients/%s/client_authorizations?_dc=%d", clientId, Date.now());
            return this._luna.request('POST', url, {json: postData});
        })
        .then((response) => {
            let body = response.body;
            let clientId = clientData.clientId;

            console.info("... creating new auth for {client id: %s}", clientId);
            //TODO: check response
            //TODO: validate response
            if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                //let auths = JSON.parse(body);
                return this._activateAuthorization(body.clientId, body.clientAuthorizationId, body);
            } else {
                throw Error('ERROR: cannot create Authorization');
            }
        });
};

// PUT https://control.akamai.com/apiprov/api/v1/clients/187568/client_authorizations/167891?_dc=1470629849548
//      {"status":"active","clientAuthorizationId":167891}
//      {"createdDate":"2016-08-08T04:17:26Z","modifiedDate":"2016-08-08T04:17:29Z","createdBy":"advocate2","modifiedBy":"advocate2","clientAuthorizationId":167891,"clientId":187568,"name":"All","description":"Desc","accessToken":"akab-gdbctbm5q4giu4ck-tntnrnpt7tzbdpl5","status":"active","testStatus":"in_progress","lastTestDate":null,"activeVersionId":null,"params":[{"grantObjectParamId":330891,"clientAuthorizationId":167891,"paramType":1,"paramName":"luna-user","paramValueDataType":"string","paramValue":"advocate2","paramCategory":"decorations","paramValues":["advocate2"]}],"services":[{"clientAuthServiceId":410854,"clientId":187568,"serviceId":10,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Alerts"},{"clientAuthServiceId":410855,"clientId":187568,"serviceId":10,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Alerts"},{"clientAuthServiceId":410856,"clientId":187568,"serviceId":1905,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Billing Center"},{"clientAuthServiceId":410857,"clientId":187568,"serviceId":1905,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Billing Center"},{"clientAuthServiceId":410858,"clientId":187568,"serviceId":4,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Billing Center Legacy"},{"clientAuthServiceId":410859,"clientId":187568,"serviceId":4,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Billing Center Legacy"},{"clientAuthServiceId":410860,"clientId":187568,"serviceId":2005,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"CPS"},{"clientAuthServiceId":410861,"clientId":187568,"serviceId":2005,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"CPS"},{"clientAuthServiceId":410862,"clientId":187568,"serviceId":5,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Case Management"},{"clientAuthServiceId":410863,"clientId":187568,"serviceId":5,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Case Management"},{"clientAuthServiceId":410864,"clientId":187568,"serviceId":1106,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Cloudlets Policy Manager"},{"clientAuthServiceId":410865,"clientId":187568,"serviceId":1,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"DNS—Zone Record Management"},{"clientAuthServiceId":410866,"clientId":187568,"serviceId":1,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"DNS—Zone Record Management"},{"clientAuthServiceId":410867,"clientId":187568,"serviceId":3,"clientAuthorizationId":167891,"serviceScope":"READ","serviceName":"DNS—Zone Traffic Reporting"},{"clientAuthServiceId":410868,"clientId":187568,"serviceId":105,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Diagnostic Tools"},{"clientAuthServiceId":410869,"clientId":187568,"serviceId":105,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Diagnostic Tools"},{"clientAuthServiceId":410870,"clientId":187568,"serviceId":405,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Edge Redirector"},{"clientAuthServiceId":410871,"clientId":187568,"serviceId":405,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Edge Redirector"},{"clientAuthServiceId":410872,"clientId":187568,"serviceId":11,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Event Center"},{"clientAuthServiceId":410873,"clientId":187568,"serviceId":11,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Event Center"},{"clientAuthServiceId":410874,"clientId":187568,"serviceId":1105,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Forward Rewrite Rules"},{"clientAuthServiceId":410875,"clientId":187568,"serviceId":1105,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Forward Rewrite Rules"},{"clientAuthServiceId":410876,"clientId":187568,"serviceId":1405,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Front End Optimization"},{"clientAuthServiceId":410877,"clientId":187568,"serviceId":1405,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Front End Optimization"},{"clientAuthServiceId":410878,"clientId":187568,"serviceId":161,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"IP/Geo Access Rules"},{"clientAuthServiceId":410879,"clientId":187568,"serviceId":161,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"IP/Geo Access Rules"},{"clientAuthServiceId":410880,"clientId":187568,"serviceId":1705,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Invoicing"},{"clientAuthServiceId":410881,"clientId":187568,"serviceId":1705,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Invoicing"},{"clientAuthServiceId":410882,"clientId":187568,"serviceId":162,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Log Delivery Service"},{"clientAuthServiceId":410883,"clientId":187568,"serviceId":162,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Log Delivery Service"},{"clientAuthServiceId":410884,"clientId":187568,"serviceId":61,"clientAuthorizationId":167891,"serviceScope":"READ","serviceName":"Luna Authentication Test"},{"clientAuthServiceId":410885,"clientId":187568,"serviceId":142,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Media Analytics API"},{"clientAuthServiceId":410886,"clientId":187568,"serviceId":164,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Media Reports"},{"clientAuthServiceId":410887,"clientId":187568,"serviceId":205,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Media Streaming"},{"clientAuthServiceId":410888,"clientId":187568,"serviceId":2,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Network Lists"},{"clientAuthServiceId":410889,"clientId":187568,"serviceId":2,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Network Lists"},{"clientAuthServiceId":410890,"clientId":187568,"serviceId":144,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Prolexic Analytics API"},{"clientAuthServiceId":410891,"clientId":187568,"serviceId":146,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Property Manager"},{"clientAuthServiceId":410892,"clientId":187568,"serviceId":146,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Property Manager"},{"clientAuthServiceId":410893,"clientId":187568,"serviceId":2505,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"SLA API"},{"clientAuthServiceId":410894,"clientId":187568,"serviceId":2505,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"SLA API"},{"clientAuthServiceId":410895,"clientId":187568,"serviceId":141,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"SPS requests"},{"clientAuthServiceId":410896,"clientId":187568,"serviceId":141,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"SPS requests"},{"clientAuthServiceId":410897,"clientId":187568,"serviceId":123,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"SaaS Registration"},{"clientAuthServiceId":410898,"clientId":187568,"serviceId":123,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"SaaS Registration"},{"clientAuthServiceId":410899,"clientId":187568,"serviceId":206,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"SecureHD Policy Editor"},{"clientAuthServiceId":411750,"clientId":187568,"serviceId":145,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Security Monitor API"},{"clientAuthServiceId":411751,"clientId":187568,"serviceId":905,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Siteshield API"},{"clientAuthServiceId":411752,"clientId":187568,"serviceId":905,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Siteshield API"},{"clientAuthServiceId":411753,"clientId":187568,"serviceId":406,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Traffic Management Configurations"},{"clientAuthServiceId":411754,"clientId":187568,"serviceId":406,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Traffic Management Configurations"},{"clientAuthServiceId":411755,"clientId":187568,"serviceId":207,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"User Admin"},{"clientAuthServiceId":411756,"clientId":187568,"serviceId":207,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"User Admin"},{"clientAuthServiceId":411757,"clientId":187568,"serviceId":101,"clientAuthorizationId":167891,"serviceScope":"READ-ONLY","serviceName":"Visitor Prioritization"},{"clientAuthServiceId":411758,"clientId":187568,"serviceId":101,"clientAuthorizationId":167891,"serviceScope":"READ-WRITE","serviceName":"Visitor Prioritization"}],"annotations":[],"fullUrl":"https://akab-drp2fxzq5c76sm5f-h7jx7drgassvxplz.luna.akamaiapis.net/"}
APIClient.prototype._activateAuthorization = function(clientId, clientAuthorizationId, payload) {
    let postData = {
        "status":"active",
        "clientAuthorizationId":clientAuthorizationId
    };

    let url = util.format("/apiprov/api/v1/clients/%s/client_authorizations/%s?_dc=%d", clientId, clientAuthorizationId, Date.now());
    return this._luna.request('PUT', url, {json: postData})
        .then((response) => {
            //TODO: parse the response body?
            //let body = response.body;

            return new Promise((resolve, reject) => {
                console.info("... activating {auth id: %s}", clientAuthorizationId);
                //TODO: check response
                //TODO: validate response
                if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                    //let auths = JSON.parse(body);
                    resolve(payload);
                } else {
                    reject(Error('ERROR: cannot activate Authorization'));
                }
            });
        });
};


// GET https://control.akamai.com/apiprov/api/v1/clients/187568/client_authorizations?_dc=1470619997753&page=1&start=0&limit=9999&sort=%5B%7B%22property%22%3A%22name%22%2C%22direction%22%3A%22ASC%22%7D%5D
//      [{"createdDate":"2015-06-08T02:28:50Z","modifiedDate":"2015-10-28T02:37:53Z","createdBy":"colinb","modifiedBy":"colinb","clientAuthorizationId":67501,"clientId":67451,"name":"AllAuth","description":null,"accessToken":"akab-dzwyltniasx2s2fw-7ah4yypbk7bcii65","status":"active","testStatus":"active","lastTestDate":"2015-10-28T02:37:53Z","activeVersionId":5}]
APIClient.prototype._getClientAuthorizations = function(clientData) {
    let clientId = clientData.clientId;
    let url = util.format("/apiprov/api/v1/clients/%s/client_authorizations?_dc=%d", clientId, Date.now());
    return this._luna.request('GET', url)
        .then((response) => {
            let body = response.body;
            console.info("... retrieving authorization list {client id: %s}", clientId);
            //TODO: check response
            //TODO: validate response
            if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                let auths = JSON.parse(body);
                let authDetails = [];
                auths = auths.filter(function (val) {
                    return val && val.status && val.status === 'active'
                });
                if (!auths || auths.length < 1)
                    return this._createClientAuthorizations(clientData);
                else
                    return Promise.all(auths.map(v => this._getAuthorizationDetails(v.clientId, v.clientAuthorizationId)));
            } else {
                throw Error('cannot communicate with authorizations api');
            }
        })
        .then(authData => {
            if (!Array.isArray(authData)) authData = [authData];
            clientData.authorizations = authData;
            return new Promise((resolve) => { resolve(clientData) });
        });
};

// GET https://control.akamai.com/apiprov/api/v1/clients/188573/client_authorizations/171768?_dc=1470662414284
//      {"createdDate":"2016-08-08T13:18:11Z","modifiedDate":"2016-08-08T13:20:14Z","createdBy":"advocate2","modifiedBy":"colinb","clientAuthorizationId":171768,"clientId":188573,"name":"READ-WRITE","description":null,"accessToken":"akab-qf5mjwmnno3sx7t7-4p6e5q6s5uznypxn","status":"active","testStatus":"in_progress","lastTestDate":null,"activeVersionId":null,"params":[{"grantObjectParamId":332898,"clientAuthorizationId":171768,"paramType":1,"paramName":"luna-user","paramValueDataType":"string","paramValue":"advocate2","paramCategory":"decorations","paramValues":["advocate2"]}],"services":[{"clientAuthServiceId":409046,"clientId":188573,"serviceId":105,"clientAuthorizationId":171768,"serviceScope":"READ-ONLY","serviceName":"Diagnostic Tools"},{"clientAuthServiceId":409047,"clientId":188573,"serviceId":105,"clientAuthorizationId":171768,"serviceScope":"READ-WRITE","serviceName":"Diagnostic Tools"}],"annotations":[],"fullUrl":"https://akab-qqomtivthgovm2de-mbthrrmz4aqtihdo.luna.akamaiapis.net/"}
APIClient.prototype._getAuthorizationDetails = function(clientId, authorizationId)
{
    let url = util.format("/apiprov/api/v1/clients/%s/client_authorizations/%s?_dc=%d", clientId, authorizationId, Date.now());
    return this._luna.request('GET', url)
        .then((response) => {
            let body = response.body;
            return new Promise((resolve, reject) => {
                console.info("... retrieving auth details {auth id: %s}", authorizationId);
                //TODO: check response
                //TODO: validate response
                if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                    let auth = JSON.parse(body);
                    resolve(auth);
                }
            });
        });
};

// PUT https://control.akamai.com/apiprov/api/v1/clients/192550/credentials/akab-jbg323k7q4os4zfv-u4t3jnbdhml62djd
//      {status: "inactive"}
//  {"createdDate":"2016-08-09T19:42:20Z","modifiedDate":"2016-08-15T14:07:58Z","createdBy":"advocate2","modifiedBy":"colinb","clientCredentialId":190232,"clientId":192550,"clientToken":"akab-jbg323k7q4os4zfv-u4t3jnbdhml62djd","status":"inactive","secret":"6BXfU1t1SO2cg2y8ZnsAq/1uDdcolefRuqjdF2EIAZQ="}
APIClient.prototype._disableClientCredentials = function(clientId, clientToken) {
    let postData = {
        "status":"inactive"
    };

    let url = util.format("/apiprov/api/v1/clients/%s/credentials/%s", clientId, clientToken);
    return this._luna.request('PUT', url, {json: postData})
        .then((response) => {
            return new Promise((resolve, reject) => {
                console.info("... disabling {client id: %s / %s}", clientId, clientToken);
                //TODO: check response
                //TODO: validate response
                if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                    resolve(response.body);
                } else {
                    reject(Error('ERROR: cannot disable Client'));
                }
            });
        });

};

// DELETE https://control.akamai.com/apiprov/api/v1/clients/192550?_dc=1471270231203
//      {clientId: 192550}
//  204
APIClient.prototype._deleteClient = function(clientId) {
    let postData = {
        "clientId":clientId
    };

    let url = util.format("/apiprov/api/v1/clients/%s?_dc=%s", clientId, Date.now());
    return this._luna.request('DELETE', url, {json: postData})
        .then((response) => {

            return new Promise((resolve, reject) => {
                console.info("... deleting {client id: %s}", clientId);
                //TODO: check response
                //TODO: validate response
                if (response.statusCode === 204) {
                    resolve();
                } else {
                    reject(Error('ERROR: cannot delete Client'));
                }
            });
        });

};


function _qualifyName(appName) {
    let appLocation = {};
    if ( typeof appName === 'object') {
        appLocation = appName;
    } else {
        let matches = appName.toString().match(/\/?(?:([^\/]+)\/)?(?:([^\/]+)\/)?(.+)/);
        if (matches) {
            appLocation.service = matches[1];
            appLocation.folder = matches[2];
            appLocation.name = matches[3];
        }
    }
    appLocation.service = appLocation.service || SERVICE_PROVIDER.LUNA;
    appLocation.folder = appLocation.folder || "default";
    return appLocation;
}

function _qualifyGrants(grant) {
    if (!grant) grant = {};
    if (grant instanceof RegExp) {
        grant = {
            match: grant
        }
    }

    if (typeof grant === 'string') {
        grant = {
            match: new RegExp(grant)
        }
    }
    return grant;
}

/**
 * Retrieve the EdgeRC for an a
 * @param appName
 * @param grant
 * @returns {Promise.<TResult>}
 */
APIClient.prototype.getEdgeRC = function(appName) {
    return this.getCredential(appName)
    .then(clientData => {
        let counter = 0;
        clientData.credentials.forEach(function(cred) {
            clientData.authorizations.forEach(function(auth) {
                console.log("\n[luna-%s-%s%s]", clientData.app.folder, clientData.app.name, counter++ > 0 ? '-'+counter : '');
                console.log("client_secret = %s", cred.secret);
                console.log("host = %s", auth.fullUrl);
                console.log("access_token = %s", auth.accessToken);
                console.log("client_token = %s", cred.clientToken);
                console.log("max_body = 131072")
            })
        });
        return new Promise((resolve, reject) => { resolve(clientData)});
    });

};

APIClient.prototype.getCredential = function(appName) {
    appName = _qualifyName(appName);

    let data = {
        app: appName
    };

    return this._luna.login()
        .then(() => this._getClient(data))
        .then(() => { return Promise.all([
            this._getClientCredentials(data),
            this._getClientAuthorizations(data)]);
        })
        .then(() => new Promise((resolve, reject) => { resolve(data)}))
};

/**
 * Creates a new set of credentials with the specified privelages for the
 * specified user.
 *
 * @param appName the application name in the form of /EndPointName/Folder/ClientName If {Folder} is omitted 'default' will be used
 * @param grant a regex or array of grants to authorize the client with
 * @param options User to assign these credentials to
 * @returns {Promise}
 */
APIClient.prototype.createCredential = function (appName,
                                                 grant = { match: /.*/},
                                                 options = {createIfAlreadyExists: true, forceCreateAuth: true}) {
    // request specific privelages and return credentials
    // with appropriate grants.

    let query = {
        app: _qualifyName(appName),
        grant: _qualifyGrants(grant)
    };

    return this._luna.login()
        .then(() => this._getClient(query))
        .then(() => this._createClientCredentials(query));
};


/**
 * Rotates the credentials specified by credentialId and returns the updated
 * credential values. This method invalidates the existing credentials,
 * and replaces them with the new updated values after the specified period of
 * time. Use of this method would require some pre-existing authentication and
 * could only be run by a user with proper privelages (admin) to rotate / alter
 * credentials
 *
 * @param   {String} appName   The ID specifying the credential to be rotated
 * @param   {String} expirationDate Timestamp specifying the date and time when
 *                                  the existing credentials will expire.
 *
 * @returns {Promise} The values for the updated credential data.
 */
APIClient.prototype.rotateCredential = function(appName, expirationDate, options = {alwaysCreateNew: true}) {
    let stillValidCreds = 0;
    let data = null;
    this.getCredential(appName)
    .then(clientData => {
        data = clientData;
        return Promise.all(
            queryData.credentials.map(v => {
                let createdDate = v.createdDate ? new Date(v.createdDate) : Date.now();
                if (!expirationDate || expirationDate > createdDate) {
                    return this._disableClientCredentials(v.clientId, v.clientToken);
                }
                else {
                    stillValidCreds++;
                    return;
                }
            })
        );
    })
    .then(() => {
        if (options.alwaysCreateNew) return this._createClientCredentials(data);
        return new Promise((resolve, reject) => { resolve(data)});
    });
};

/**
 * Deletes the credentials specified by credentialId and returns success or
 * failure. If expirationDate is specified, the credentials will expire at the
 * given date/time. If not, the default is to expire immediately.
 *
 * @param   {String} credentialId   The ID specifying the credential to be rotated
 * @param   {String} expirationDate
 *
 *
 * @return  {Object}                The values for the updated credential data.
 */

/**
 *
 * @param appName
 * @param expirationDate Timestamp specifying the date and time when the existing credentials will expire.
 * @param options
 * @returns {Promise}
 */
APIClient.prototype.deleteCredential = function(appName, expirationDate, options = {disableOnly: true}) {

    appName = _qualifyName(appName);
    if (expirationDate && !(expirationDate instanceof Date))
        expirationDate = new Date(expirationDate);

    let queryData = {
        app: appName
    };

    return this._luna.login()
        .then(() => this._getClient(queryData))
        .then(() => this._getClientCredentials(queryData))
        .then(() => {
            if (options && options.disableOnly)
                return Promise.all(
                    queryData.credentials.map(v => {
                        let createdDate = v.createdDate ? new Date(v.createdDate) : Date.now();
                        if (!expirationDate || expirationDate > createdDate)
                            return this._disableClientCredentials(v.clientId, v.clientToken);
                        return;
                    }));
            else
                return this._deleteClient(queryData.clientId);
        });
};

/**
 * Return a list of all credentials created prior to the specified timestamp.
 * @param  {String} timestamp     Timestamp representing the date/time prior to which
 *                                credentials should be listed.
 * @return {Array}                Array of active credentials created prior to the
 *                                supplied timestamp.
 */
function getExpiringCredentials(timestamp) {
    this.getCredential()
    //TODO
}

module.exports = APIClient;