/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState, useEffect } from 'react';
import { usePrevious } from 'src/hooks/usePrevious';
import { useSelector, useDispatch } from 'react-redux';
import { t, SupersetTheme, css, useTheme } from '@superset-ui/core';
import Icons from 'src/components/Icons';
import { Switch } from 'src/components/Switch';
import { AlertObject } from 'src/views/CRUD/alert/types';
import { Menu } from 'src/components/Menu';
import Checkbox from 'src/components/Checkbox';
import { noOp } from 'src/utils/common';
import { NoAnimationDropdown } from 'src/components/Dropdown';
import DeleteModal from 'src/components/DeleteModal';
import ReportModal from 'src/components/ReportModal';
import { ChartState } from 'src/explore/types';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import {
  fetchUISpecificReport,
  toggleActive,
  deleteActiveReport,
} from 'src/reports/actions/reports';
import { reportSelector } from 'src/views/CRUD/hooks';
import { isFeatureEnabled, FeatureFlag } from 'src/featureFlags';
import { MenuItemWithCheckboxContainer } from 'src/explore/components/ExploreAdditionalActionsMenu/index';
import { AntdDropdown } from 'src/components';

const deleteColor = (theme: SupersetTheme) => css`
  color: ${theme.colors.error.base};
`;

const onMenuHover = (theme: SupersetTheme) => css`
  & .ant-menu-item,
  ant-menu-submenu {
    padding: 5px 12px;
    margin-top: 0px;
    margin-bottom: 4px;
  }
  & .ant-menu-submenu-title,
  ant-menu-item {
    :hover {
      color: ${theme.colors.grayscale.dark1};
    }
    &:not(:focus) {
      color: ${theme.colors.grayscale.dark1};
    }
  }
  .ant-menu-submenu-title {
    padding: 0px 24px 0px 12px;
    margin: 0px;
  }

  :hover {
    background-color: ${theme.colors.secondary.light5};
  }
`;

const onMenuItemHover = (theme: SupersetTheme) => css`
  :hover {
    background-color: ${theme.colors.secondary.light5};
  }
  &:not(:focus) {
    color: ${theme.colors.grayscale.dark1};
  }
`;

export enum CreationMethod {
  CHARTS = 'charts',
  DASHBOARDS = 'dashboards',
}
export interface HeaderReportProps {
  dashboardId?: number;
  chart?: ChartState;
  useTextMenu?: boolean;
  visible?: boolean;
  setIsDropdownVisible?: () => void;
}

export default function HeaderReportDropDown({
  dashboardId,
  chart,
  useTextMenu = false,
}: HeaderReportProps) {
  const dispatch = useDispatch();
  const report = useSelector<any, AlertObject>(state => {
    const resourceType = dashboardId
      ? CreationMethod.DASHBOARDS
      : CreationMethod.CHARTS;
    return reportSelector(state, resourceType, dashboardId || chart?.id);
  });
  const isReportActive: boolean = report?.active || false;
  const user: UserWithPermissionsAndRoles = useSelector<
    any,
    UserWithPermissionsAndRoles
  >(state => state.user || state.explore?.user);
  const canAddReports = () => {
    if (!isFeatureEnabled(FeatureFlag.ALERT_REPORTS)) {
      return false;
    }

    if (!user?.userId) {
      // this is in the case that there is an anonymous user.
      return false;
    }
    const roles = Object.keys(user.roles || []);
    const permissions = roles.map(key =>
      user.roles[key].filter(
        perms => perms[0] === 'menu_access' && perms[1] === 'Manage',
      ),
    );
    return permissions[0].length > 0;
  };

  const [currentReportDeleting, setCurrentReportDeleting] =
    useState<AlertObject | null>(null);
  const theme = useTheme();
  const prevDashboard = usePrevious(dashboardId);
  const [showModal, setShowModal] = useState<boolean>(false);
  const toggleActiveKey = async (data: AlertObject, checked: boolean) => {
    if (data?.id) {
      dispatch(toggleActive(data, checked));
    }
  };

  const handleReportDelete = (report: AlertObject) => {
    dispatch(deleteActiveReport(report));
    setCurrentReportDeleting(null);
  };

  const shouldFetch =
    canAddReports() &&
    !!((dashboardId && prevDashboard !== dashboardId) || chart?.id);

  useEffect(() => {
    if (shouldFetch) {
      dispatch(
        fetchUISpecificReport({
          userId: user.userId,
          filterField: dashboardId ? 'dashboard_id' : 'chart_id',
          creationMethod: dashboardId ? 'dashboards' : 'charts',
          resourceId: dashboardId || chart?.id,
        }),
      );
    }
  }, []);

  const items = [
    {
      label: t('Manage email report'),
      key: 'SubMenu',
      children: [
        {
          label: (
            <MenuItemWithCheckboxContainer>
              <Checkbox checked={isReportActive} onChange={noOp} />
              {t('Email reports active')}
            </MenuItemWithCheckboxContainer>
          ),
          onclick: () => toggleActiveKey(report, !isReportActive),
        },
        {
          label: t('Edit email report'),
          onclick: () => setShowModal(true),
        },
        {
          label: t('Delete email report'),
          onclick: () => setCurrentReportDeleting(report),
        },
      ],
    },
  ];

  const textMenu = () =>
    report ? (
      <Menu.SubMenu title={t('Manage email reports')}>
        <Menu.Item onClick={() => toggleActiveKey(report, !isReportActive)}>
          {/* <MenuItemWithCheckboxContainer> */}
          {/* <Checkbox checked={isReportActive} onChange={noOp} /> */}
          {t('Email reports active')}
          {/* </MenuItemWithCheckboxContainer> */}
        </Menu.Item>
        <Menu.Item onClick={() => setShowModal(true)}>
          {t('Edit email report')}
        </Menu.Item>
        <Menu.Item onClick={() => setCurrentReportDeleting(report)}>
          {t('Delete email report')}
        </Menu.Item>
      </Menu.SubMenu>
    ) : (
      <Menu selectable={false}>
        <Menu.Item onClick={() => setShowModal(true)}>
          {t('Set up an email report')}
        </Menu.Item>
      </Menu>
    );

  const menu = () => (
    <Menu selectable={false} css={{ width: '200px' }}>
      <Menu.Item>
        {t('Email reports active')}
        <Switch
          data-test="toggle-active"
          checked={isReportActive}
          onClick={(checked: boolean) => toggleActiveKey(report, checked)}
          size="small"
          css={{ marginLeft: theme.gridUnit * 2 }}
        />
      </Menu.Item>
      <Menu.Item onClick={() => setShowModal(true)}>
        {t('Edit email report')}
      </Menu.Item>
      <Menu.Item
        onClick={() => setCurrentReportDeleting(report)}
        css={deleteColor}
      >
        {t('Delete email report')}
      </Menu.Item>
    </Menu>
  );

  const iconMenu = () =>
    report ? (
      <>
        <NoAnimationDropdown
          overlay={menu()}
          trigger={['click']}
          getPopupContainer={(triggerNode: any) =>
            triggerNode.closest('.action-button')
          }
        >
          <span role="button" className="action-button" tabIndex={0}>
            <Icons.Calendar />
          </span>
        </NoAnimationDropdown>
      </>
    ) : (
      <span
        role="button"
        title={t('Schedule email report')}
        tabIndex={0}
        className="action-button"
        onClick={() => setShowModal(true)}
      >
        <Icons.Calendar />
      </span>
    );

  return (
    <>
      {canAddReports() && (
        <>
          <ReportModal
            userId={user.userId}
            show={showModal}
            onHide={() => setShowModal(false)}
            userEmail={user.email}
            dashboardId={dashboardId}
            chart={chart}
            creationMethod={
              dashboardId ? CreationMethod.DASHBOARDS : CreationMethod.CHARTS
            }
          />
          {useTextMenu ? textMenu() : iconMenu()}
          {currentReportDeleting && (
            <DeleteModal
              description={t(
                'This action will permanently delete %s.',
                currentReportDeleting?.name,
              )}
              onConfirm={() => {
                if (currentReportDeleting) {
                  handleReportDelete(currentReportDeleting);
                }
              }}
              onHide={() => setCurrentReportDeleting(null)}
              open
              title={t('Delete Report?')}
            />
          )}
        </>
      )}
    </>
  );
}
